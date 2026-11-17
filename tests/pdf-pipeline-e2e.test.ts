import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanText } from '@/lib/pdf/clean';
import { extractPdfPages, verifyPdfReadable } from '@/lib/pdf/extract';
import { validatePdfUpload } from '@/lib/pdf/validate';
import { chunkPages } from '@/lib/rag/chunk';

function loadDotEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

loadDotEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'documents';
const embeddingModel = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const embeddingDim = Number(process.env.GEMINI_EMBEDDING_DIM || '768');

const hasAllEnv = Boolean(
  supabaseUrl && anonKey && serviceRoleKey && geminiApiKey,
);

async function buildRealTestPdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pageParagraphs = [
    [
      'Page 1: Architecture Overview of the AI Document Assistant.',
      'The system uses Next.js App Router, Supabase Postgres with pgvector, and Google Gemini.',
      'Uploaded PDFs are validated for magic bytes, hashed with SHA-256, and stored in a private bucket.',
      'Each page is extracted independently so citations always map accurately to the source page number.',
    ].join(' '),
    [
      'Page 2: Chunking and Embedding Pipeline.',
      'Long pages are split into overlapping chunks of 1200 characters with 200 characters of overlap.',
      'Chunks never cross page boundaries. Every chunk is embedded using Gemini embeddings at 768 dimensions.',
      'Embeddings are stored in document_chunks with an HNSW cosine index for fast semantic retrieval.',
    ].join(' '),
    [
      'Page 3: Security and Access Control.',
      'Row Level Security (RLS) ensures every user can only read, process, and delete their own documents.',
      'Service role credentials and GEMINI_API_KEY remain strictly on the server and never enter client bundles.',
    ].join(' '),
  ];

  for (const paragraph of pageParagraphs) {
    const page = pdfDoc.addPage([612, 792]);
    // Wrap into lines so pdf-lib draws all text cleanly within page width
    const words = paragraph.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > 75) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);

    let y = 720;
    for (const line of lines) {
      page.drawText(line, { x: 50, y, size: 11, font });
      y -= 18;
    }
  }

  return pdfDoc.save();
}

describe.skipIf(!hasAllEnv)('Phase 4 E2E PDF Processing & Embeddings', () => {
  let admin: SupabaseClient;
  let userClient: SupabaseClient;
  let userId = '';
  let docId = '';
  let storagePath = '';

  const testRunId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `phase4-e2e-${testRunId}@example.com`;
  const password = `TestPass!${testRunId}`;

  beforeAll(async () => {
    admin = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: bucketErr } = await admin.storage.getBucket(bucket);
    if (bucketErr) {
      const { error: createBucketErr } = await admin.storage.createBucket(bucket, {
        public: false,
      });
      if (createBucketErr) {
        throw new Error(`Failed to create storage bucket "${bucket}": ${createBucketErr.message}`);
      }
    }

    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      throw new Error(`Failed to create test user: ${created.error?.message}`);
    }
    userId = created.data.user.id;

    userClient = createClient(supabaseUrl!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const signIn = await userClient.auth.signInWithPassword({ email, password });
    if (signIn.error) {
      throw new Error(`Failed to sign in test user: ${signIn.error.message}`);
    }
  });

  afterAll(async () => {
    if (storagePath && admin) {
      await admin.storage.from(bucket).remove([storagePath]).catch(() => {});
    }
    if (docId && admin) {
      await admin.from('documents').delete().eq('id', docId);
    }
    if (userId && admin) {
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it('uploads, locks, extracts, chunks, embeds, stores, searches, and deletes a real PDF', async () => {
    const startMs = Date.now();
    const pdfBytes = await buildRealTestPdf();
    const buffer = Buffer.from(pdfBytes);

    // 1. Validate + hash
    validatePdfUpload(
      { fileName: 'e2e-test.pdf', fileSize: buffer.byteLength, mimeType: 'application/pdf' },
      buffer,
      10,
    );
    await verifyPdfReadable(buffer, 200);
    const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // 2. Upload to private bucket at userId/docId.pdf
    docId = crypto.randomUUID();
    storagePath = `${userId}/${docId}.pdf`;

    const uploadRes = await admin.storage
      .from(bucket)
      .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false });
    expect(uploadRes.error).toBeNull();

    const insertDoc = await userClient
      .from('documents')
      .insert({
        id: docId,
        user_id: userId,
        file_name: 'e2e-test.pdf',
        file_size: buffer.byteLength,
        mime_type: 'application/pdf',
        storage_path: storagePath,
        content_hash: contentHash,
        status: 'uploaded',
      })
      .select('*')
      .single();
    expect(insertDoc.error).toBeNull();

    // 3. Atomic processing lock
    const lock1 = await userClient
      .from('documents')
      .update({ status: 'processing', error_message: null })
      .eq('id', docId)
      .eq('user_id', userId)
      .in('status', ['uploaded', 'failed'])
      .select('*')
      .maybeSingle();
    expect(lock1.data?.status).toBe('processing');

    // Second concurrent lock attempt must return null (409)
    const lock2 = await userClient
      .from('documents')
      .update({ status: 'processing', error_message: null })
      .eq('id', docId)
      .eq('user_id', userId)
      .in('status', ['uploaded', 'failed'])
      .select('*')
      .maybeSingle();
    expect(lock2.data).toBeNull();

    // 4. Download, extract, clean, chunk
    const downloaded = await admin.storage.from(bucket).download(storagePath);
    expect(downloaded.error).toBeNull();
    const downloadedBytes = new Uint8Array(await downloaded.data!.arrayBuffer());

    const extracted = await extractPdfPages(downloadedBytes, 200);
    expect(extracted.totalPages).toBe(3);

    const cleanedPages = extracted.pages.map((p) => ({
      pageNumber: p.pageNumber,
      text: cleanText(p.text),
    }));

    const chunks = chunkPages(cleanedPages, {
      chunkSize: 300,
      chunkOverlap: 50,
    });
    expect(chunks.length).toBeGreaterThan(3);

    // 5. Real Gemini Embeddings
    const ai = new GoogleGenAI({ apiKey: geminiApiKey! });
    const embedRes = await ai.models.embedContent({
      model: embeddingModel,
      contents: chunks.map((c) => c.content),
      config: {
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: embeddingDim,
      },
    });

    const vectors = embedRes.embeddings?.map((e) => e.values ?? []) ?? [];
    expect(vectors).toHaveLength(chunks.length);
    expect(vectors[0]).toHaveLength(embeddingDim);

    // 6. Insert chunks + set status ready
    const rows = chunks.map((c, idx) => ({
      document_id: docId,
      user_id: userId,
      chunk_index: c.chunkIndex,
      page_number: c.pageNumber,
      content: c.content,
      embedding: `[${vectors[idx]!.join(',')}]`,
    }));
    const insertChunks = await userClient.from('document_chunks').insert(rows);
    expect(insertChunks.error).toBeNull();

    const readyRes = await userClient
      .from('documents')
      .update({ status: 'ready', total_pages: extracted.totalPages })
      .eq('id', docId)
      .eq('user_id', userId)
      .select('*')
      .single();
    expect(readyRes.error).toBeNull();
    expect(readyRes.data.status).toBe('ready');
    expect(readyRes.data.total_pages).toBe(3);

    // 7. Verify vector search returns relevant chunk
    const queryEmbed = await ai.models.embedContent({
      model: embeddingModel,
      contents: 'What is the chunk size and overlap?',
      config: {
        taskType: 'RETRIEVAL_QUERY',
        outputDimensionality: embeddingDim,
      },
    });
    const queryVec = queryEmbed.embeddings?.[0]?.values ?? [];
    expect(queryVec).toHaveLength(embeddingDim);

    const matched = await userClient.rpc('match_document_chunks', {
      query_embedding: `[${queryVec.join(',')}]`,
      match_document_id: docId,
      match_count: 3,
      min_similarity: 0.3,
    });
    expect(matched.error).toBeNull();
    expect(matched.data.length).toBeGreaterThan(0);
    expect(matched.data[0].page_number).toBe(2);

    // 8. Delete chunks, document, storage file
    await userClient.from('document_chunks').delete().eq('document_id', docId).eq('user_id', userId);
    await userClient.from('documents').delete().eq('id', docId).eq('user_id', userId);
    await admin.storage.from(bucket).remove([storagePath]);

    const elapsedMs = Date.now() - startMs;
    console.log(
      `[Phase 4 E2E Report] pages=${extracted.totalPages}, chunks=${chunks.length}, embeddingDim=${embeddingDim}, elapsedMs=${elapsedMs}`,
    );
  }, 30_000);
});
