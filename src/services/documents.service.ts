import 'server-only';
import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env';
import { AppError } from '@/lib/errors/app-error';
import { embedTexts } from '@/lib/gemini/embeddings';
import { cleanText } from '@/lib/pdf/clean';
import { extractPdfPages, verifyPdfReadable } from '@/lib/pdf/extract';
import { validatePdfUpload } from '@/lib/pdf/validate';
import { chunkPages } from '@/lib/rag/chunk';
import { enforceRateLimitAsync } from '@/lib/rate-limit';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import type { DocumentRow } from '@/lib/supabase/types';
import { chunksRepository } from '@/repositories/chunks.repository';
import { conversationsRepository } from '@/repositories/conversations.repository';
import { documentsRepository } from '@/repositories/documents.repository';

const CHUNK_INSERT_BATCH_SIZE = 100;
const UPLOAD_RATE_WINDOW_MS = 60 * 60 * 1000;

export interface UploadDocumentInput {
  fileName: string;
  fileSize: number;
  mimeType: string;
  buffer: Buffer;
}

export interface ProcessDocumentResult {
  document: DocumentRow;
  stats: {
    totalPages: number;
    totalChunks: number;
    durationMs: number;
  };
}

export const documentsService = {
  async listDocuments(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<DocumentRow[]> {
    return documentsRepository.listByUser(supabase, userId);
  },

  async getDocument(
    supabase: SupabaseClient,
    documentId: string,
    userId: string,
  ): Promise<DocumentRow> {
    const doc = await documentsRepository.findByIdForUser(
      supabase,
      documentId,
      userId,
    );
    if (!doc) {
      throw new AppError('NOT_FOUND', 'Document not found', 404);
    }
    return doc;
  },

  async uploadDocument(
    supabase: SupabaseClient,
    userId: string,
    input: UploadDocumentInput,
  ): Promise<DocumentRow> {
    const env = getServerEnv();

    await enforceRateLimitAsync(
      {
        namespace: 'upload',
        key: userId,
        limit: env.RATE_LIMIT_UPLOAD_PER_HOUR,
        windowMs: UPLOAD_RATE_WINDOW_MS,
      },
      'Upload rate limit exceeded. Please wait before uploading another PDF.',
    );

    const meta = validatePdfUpload(
      {
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
      },
      input.buffer,
      env.MAX_UPLOAD_MB,
    );

    // Reject corrupt, encrypted, or over-page-limit PDFs before storing
    await verifyPdfReadable(input.buffer, env.MAX_PDF_PAGES);

    const contentHash = crypto
      .createHash('sha256')
      .update(input.buffer)
      .digest('hex');

    const duplicate = await documentsRepository.findByHashForUser(
      supabase,
      userId,
      contentHash,
    );
    if (duplicate) {
      throw new AppError(
        'CONFLICT',
        `This PDF has already been uploaded as "${duplicate.file_name}".`,
        409,
      );
    }

    const docId = crypto.randomUUID();
    const storagePath = `${userId}/${docId}.pdf`;
    const admin = createAdminSupabaseClient();

    const { error: uploadError } = await admin.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .upload(storagePath, input.buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Storage Upload Error]', uploadError.message);
      throw new AppError(
        'INTERNAL_ERROR',
        'Failed to store PDF file. Please try again.',
        500,
      );
    }

    try {
      return await documentsRepository.create(supabase, {
        id: docId,
        userId,
        fileName: meta.fileName,
        fileSize: meta.fileSize,
        mimeType: meta.mimeType,
        storagePath,
        contentHash,
        status: 'uploaded',
      });
    } catch (err) {
      await admin.storage
        .from(env.SUPABASE_STORAGE_BUCKET)
        .remove([storagePath])
        .catch(() => {});
      throw err;
    }
  },

  async processDocument(
    supabase: SupabaseClient,
    documentId: string,
    userId: string,
  ): Promise<ProcessDocumentResult> {
    const startTime = Date.now();
    const lockedDoc = await documentsRepository.acquireProcessingLock(
      supabase,
      documentId,
      userId,
    );

    if (!lockedDoc) {
      const existing = await documentsRepository.findByIdForUser(
        supabase,
        documentId,
        userId,
      );
      if (!existing) {
        throw new AppError('NOT_FOUND', 'Document not found', 404);
      }
      if (existing.status === 'processing') {
        throw new AppError(
          'CONFLICT',
          'Document is already being processed.',
          409,
        );
      }
      throw new AppError(
        'CONFLICT',
        'Document has already been processed.',
        409,
      );
    }

    try {
      const env = getServerEnv();
      const admin = createAdminSupabaseClient();

      const { data: fileBlob, error: downloadError } = await admin.storage
        .from(env.SUPABASE_STORAGE_BUCKET)
        .download(lockedDoc.storage_path);

      if (downloadError || !fileBlob) {
        throw new AppError(
          'INTERNAL_ERROR',
          'Could not retrieve PDF file from storage.',
          500,
        );
      }

      const buffer = new Uint8Array(await fileBlob.arrayBuffer());
      const extracted = await extractPdfPages(buffer, env.MAX_PDF_PAGES);

      const cleanedPages = extracted.pages.map((p) => ({
        pageNumber: p.pageNumber,
        text: cleanText(p.text),
      }));

      const hasExtractableText = cleanedPages.some((p) => p.text.length > 0);
      if (!hasExtractableText) {
        throw new AppError(
          'VALIDATION_ERROR',
          'No extractable text found. Scanned or image-only PDFs are not supported.',
          400,
        );
      }

      const chunks = chunkPages(cleanedPages, {
        chunkSize: env.CHUNK_SIZE_CHARS,
        chunkOverlap: env.CHUNK_OVERLAP_CHARS,
      });

      if (chunks.length === 0) {
        throw new AppError(
          'VALIDATION_ERROR',
          'No extractable text found. Scanned or image-only PDFs are not supported.',
          400,
        );
      }

      const embeddings = await embedTexts(
        chunks.map((c) => c.content),
        'RETRIEVAL_DOCUMENT',
      );

      // Clear previous chunks if retrying a previously failed document
      await chunksRepository.deleteByDocumentForUser(
        supabase,
        documentId,
        userId,
      );

      const chunkInputs = chunks.map((chunk, idx) => {
        const embedding = embeddings[idx];
        if (!embedding) {
          throw new AppError(
            'INTERNAL_ERROR',
            'Missing embedding vector for document chunk.',
            500,
          );
        }
        return {
          documentId,
          userId,
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber,
          content: chunk.content,
          embedding,
        };
      });

      for (let i = 0; i < chunkInputs.length; i += CHUNK_INSERT_BATCH_SIZE) {
        const batch = chunkInputs.slice(i, i + CHUNK_INSERT_BATCH_SIZE);
        await chunksRepository.insertBatch(supabase, batch);
      }

      const updatedDoc = await documentsRepository.updateStatusForUser(
        supabase,
        documentId,
        userId,
        'ready',
        {
          totalPages: extracted.totalPages,
          errorMessage: null,
        },
      );

      if (!updatedDoc) {
        throw new AppError('NOT_FOUND', 'Document not found', 404);
      }

      return {
        document: updatedDoc,
        stats: {
          totalPages: extracted.totalPages,
          totalChunks: chunks.length,
          durationMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      console.error('[Document Process Error]', documentId, error);

      const safeMessage =
        error instanceof AppError
          ? error.message
          : 'Failed to process PDF document. Please try again.';

      await documentsRepository
        .updateStatusForUser(supabase, documentId, userId, 'failed', {
          errorMessage: safeMessage,
        })
        .catch((updateErr) => {
          console.error('[Failed Status Update Error]', documentId, updateErr);
        });

      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('INTERNAL_ERROR', safeMessage, 500);
    }
  },

  async deleteDocument(
    supabase: SupabaseClient,
    documentId: string,
    userId: string,
  ): Promise<{ id: string }> {
    const existing = await documentsRepository.findByIdForUser(
      supabase,
      documentId,
      userId,
    );
    if (!existing) {
      throw new AppError('NOT_FOUND', 'Document not found', 404);
    }

    await chunksRepository.deleteByDocumentForUser(
      supabase,
      documentId,
      userId,
    );
    await conversationsRepository.deleteByDocumentForUser(
      supabase,
      documentId,
      userId,
    );

    const deleted = await documentsRepository.deleteForUser(
      supabase,
      documentId,
      userId,
    );
    if (!deleted) {
      throw new AppError('NOT_FOUND', 'Document not found', 404);
    }

    if (deleted.storage_path) {
      const env = getServerEnv();
      const admin = createAdminSupabaseClient();
      const { error: storageError } = await admin.storage
        .from(env.SUPABASE_STORAGE_BUCKET)
        .remove([deleted.storage_path]);
      if (storageError) {
        console.error(
          '[Storage Cleanup Warning]',
          deleted.id,
          storageError.message,
        );
      }
    }

    return { id: deleted.id };
  },

  async getSignedFileUrl(
    supabase: SupabaseClient,
    documentId: string,
    userId: string,
  ): Promise<{ url: string; expiresIn: number; fileName: string; totalPages: number | null }> {
    const doc = await documentsRepository.findByIdForUser(
      supabase,
      documentId,
      userId,
    );
    if (!doc) {
      throw new AppError('NOT_FOUND', 'Document not found', 404);
    }

    const env = getServerEnv();
    const admin = createAdminSupabaseClient();
    const expiresIn = 300;
    const { data, error } = await admin.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .createSignedUrl(doc.storage_path, expiresIn);

    if (error || !data?.signedUrl) {
      console.error('[Signed URL Error]', doc.id, error?.message);
      throw new AppError(
        'INTERNAL_ERROR',
        'Failed to generate document access URL.',
        500,
      );
    }

    return {
      url: data.signedUrl,
      expiresIn,
      fileName: doc.file_name,
      totalPages: doc.total_pages,
    };
  },
};
