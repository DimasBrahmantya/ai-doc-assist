import type { SupabaseClient, User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mockRequireAuth = vi.fn();
vi.mock('@/lib/auth/session', () => ({
  requireAuth: () => mockRequireAuth(),
}));

const mockGetServerEnv = vi.fn();
vi.mock('@/lib/env', () => ({
  getServerEnv: () => mockGetServerEnv(),
}));

const mockCreateSignedUrl = vi.fn();
const mockStorageUpload = vi.fn();
const mockStorageRemove = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: () => ({
    storage: {
      from: () => ({
        createSignedUrl: mockCreateSignedUrl,
        upload: mockStorageUpload,
        remove: mockStorageRemove,
      }),
    },
  }),
}));

const mockRunRagPipeline = vi.fn();
vi.mock('@/lib/rag/pipeline', () => ({
  runRagPipeline: (...args: unknown[]) => mockRunRagPipeline(...args),
}));

import { POST as postChat } from '@/app/api/chat/route';
import {
  DELETE as deleteConversation,
  GET as getConversation,
  PATCH as patchConversation,
} from '@/app/api/conversations/[id]/route';
import {
  GET as listConversations,
  POST as createConversation,
} from '@/app/api/conversations/route';
import { GET as getDocumentFile } from '@/app/api/documents/[id]/file/route';
import { POST as processDocument } from '@/app/api/documents/[id]/process/route';
import {
  DELETE as deleteDocument,
  GET as getDocument,
} from '@/app/api/documents/[id]/route';
import { GET as listDocuments } from '@/app/api/documents/route';
import { POST as uploadDocument } from '@/app/api/documents/upload/route';
import { ZodError } from 'zod';
import { AppError } from '@/lib/errors/app-error';
import { resetRateLimitStore } from '@/lib/rate-limit';
import { chunksRepository } from '@/repositories/chunks.repository';
import { conversationsRepository } from '@/repositories/conversations.repository';
import { documentsRepository } from '@/repositories/documents.repository';
import { messagesRepository } from '@/repositories/messages.repository';
import { documentsService } from '@/services/documents.service';

const USER_A = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } as User;
const USER_B = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' } as User;
const DOC_A_ID = '11111111-1111-4111-8111-111111111111';
const CONV_A_ID = '22222222-2222-4222-8222-222222222222';
const fakeSupabase = {} as SupabaseClient;

const docOwnedByA = {
  id: DOC_A_ID,
  user_id: USER_A.id,
  file_name: 'secret-a.pdf',
  file_size: 1024,
  mime_type: 'application/pdf',
  storage_path: `${USER_A.id}/${DOC_A_ID}.pdf`,
  content_hash: 'abc123',
  status: 'ready' as const,
  error_message: null,
  total_pages: 3,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const convOwnedByA = {
  id: CONV_A_ID,
  user_id: USER_A.id,
  document_id: DOC_A_ID,
  title: 'User A Chat',
  created_at: '2026-01-01T00:00:00.000Z',
};

function makeDefaultEnv() {
  return {
    GEMINI_API_KEY: 'test-key',
    GEMINI_CHAT_MODEL: 'gemini-3.5-flash-lite',
    GEMINI_EMBEDDING_MODEL: 'gemini-embedding-001',
    GEMINI_EMBEDDING_DIM: 768,
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    SUPABASE_STORAGE_BUCKET: 'documents',
    MAX_UPLOAD_MB: 10,
    MAX_PDF_PAGES: 200,
    RAG_TOP_K: 6,
    RAG_MIN_SIMILARITY: 0.35,
    CHUNK_SIZE_CHARS: 1200,
    CHUNK_OVERLAP_CHARS: 200,
    RATE_LIMIT_CHAT_PER_MIN: 20,
    RATE_LIMIT_UPLOAD_PER_HOUR: 2,
  };
}

describe('API Authentication, Authorization & Security', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetRateLimitStore();
    mockGetServerEnv.mockReturnValue(makeDefaultEnv());
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://example.supabase.co/signed/url' },
      error: null,
    });
    mockStorageUpload.mockResolvedValue({ error: null });
    mockStorageRemove.mockResolvedValue({ error: null });

    // Simulate ownership-filtered repositories: only return records when userId === USER_A.id
    vi.spyOn(documentsRepository, 'findByIdForUser').mockImplementation(
      async (_sb, docId, userId) =>
        docId === DOC_A_ID && userId === USER_A.id ? docOwnedByA : null,
    );
    vi.spyOn(documentsRepository, 'deleteForUser').mockImplementation(
      async (_sb, docId, userId) =>
        docId === DOC_A_ID && userId === USER_A.id ? docOwnedByA : null,
    );
    vi.spyOn(documentsRepository, 'acquireProcessingLock').mockImplementation(
      async (_sb, docId, userId) =>
        docId === DOC_A_ID && userId === USER_A.id ? docOwnedByA : null,
    );
    vi.spyOn(conversationsRepository, 'findByIdForUser').mockImplementation(
      async (_sb, convId, userId) =>
        convId === CONV_A_ID && userId === USER_A.id ? convOwnedByA : null,
    );
    vi.spyOn(conversationsRepository, 'updateTitleForUser').mockImplementation(
      async (_sb, convId, userId, title) =>
        convId === CONV_A_ID && userId === USER_A.id
          ? { ...convOwnedByA, title }
          : null,
    );
    vi.spyOn(conversationsRepository, 'deleteForUser').mockImplementation(
      async (_sb, convId, userId) =>
        convId === CONV_A_ID && userId === USER_A.id ? convOwnedByA : null,
    );
  });

  describe('Unauthenticated requests return 401', () => {
    beforeEach(() => {
      mockRequireAuth.mockRejectedValue(
        new AppError('UNAUTHORIZED', 'Authentication required', 401),
      );
    });

    it('rejects all protected document, conversation, and chat routes', async () => {
      const idCtx = { params: Promise.resolve({ id: DOC_A_ID }) };
      const req = new Request('http://localhost/api/test', { method: 'POST' });

      const responses = await Promise.all([
        listDocuments(),
        uploadDocument(req),
        getDocument(req, idCtx),
        deleteDocument(req, idCtx),
        getDocumentFile(req, idCtx),
        processDocument(req, idCtx),
        listConversations(),
        createConversation(req),
        getConversation(req, idCtx),
        patchConversation(req, idCtx),
        deleteConversation(req, idCtx),
        postChat(req),
      ]);

      for (const res of responses) {
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error.code).toBe('UNAUTHORIZED');
      }
    });
  });

  describe('Cross-user authorization: User B cannot access User A resources', () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ supabase: fakeSupabase, user: USER_B });
    });

    it('blocks User B from GET /api/documents/[id] on User A document', async () => {
      const res = await getDocument(
        new Request(`http://localhost/api/documents/${DOC_A_ID}`),
        { params: Promise.resolve({ id: DOC_A_ID }) },
      );
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({
        error: { code: 'NOT_FOUND', message: 'Document not found' },
      });
    });

    it('blocks User B from DELETE /api/documents/[id] without touching chunks or storage', async () => {
      const deleteChunksSpy = vi.spyOn(chunksRepository, 'deleteByDocumentForUser');
      const deleteConvsSpy = vi.spyOn(conversationsRepository, 'deleteByDocumentForUser');

      const res = await deleteDocument(
        new Request(`http://localhost/api/documents/${DOC_A_ID}`, { method: 'DELETE' }),
        { params: Promise.resolve({ id: DOC_A_ID }) },
      );

      expect(res.status).toBe(404);
      expect(deleteChunksSpy).not.toHaveBeenCalled();
      expect(deleteConvsSpy).not.toHaveBeenCalled();
      expect(mockStorageRemove).not.toHaveBeenCalled();
    });

    it('blocks User B from GET /api/documents/[id]/file and never mints signed URL', async () => {
      const res = await getDocumentFile(
        new Request(`http://localhost/api/documents/${DOC_A_ID}/file`),
        { params: Promise.resolve({ id: DOC_A_ID }) },
      );

      expect(res.status).toBe(404);
      expect(mockCreateSignedUrl).not.toHaveBeenCalled();
    });

    it('blocks User B from POST /api/documents/[id]/process', async () => {
      const res = await processDocument(
        new Request(`http://localhost/api/documents/${DOC_A_ID}/process`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ id: DOC_A_ID }) },
      );

      expect(res.status).toBe(404);
    });

    it('blocks User B from GET/PATCH/DELETE /api/conversations/[id] on User A conversation', async () => {
      const ctx = { params: Promise.resolve({ id: CONV_A_ID }) };

      const getRes = await getConversation(
        new Request(`http://localhost/api/conversations/${CONV_A_ID}`),
        ctx,
      );
      expect(getRes.status).toBe(404);

      const patchRes = await patchConversation(
        new Request(`http://localhost/api/conversations/${CONV_A_ID}`, {
          method: 'PATCH',
          body: JSON.stringify({ title: 'Hijacked' }),
          headers: { 'Content-Type': 'application/json' },
        }),
        ctx,
      );
      expect(patchRes.status).toBe(404);

      const delRes = await deleteConversation(
        new Request(`http://localhost/api/conversations/${CONV_A_ID}`, {
          method: 'DELETE',
        }),
        ctx,
      );
      expect(delRes.status).toBe(404);
    });

    it('blocks User B from creating a conversation on User A document', async () => {
      const createSpy = vi.spyOn(conversationsRepository, 'create');

      const res = await createConversation(
        new Request('http://localhost/api/conversations', {
          method: 'POST',
          body: JSON.stringify({ documentId: DOC_A_ID, title: 'Steal' }),
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      expect(res.status).toBe(404);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('blocks User B from POST /api/chat on User A conversation', async () => {
      const createMsgSpy = vi.spyOn(messagesRepository, 'create');

      const res = await postChat(
        new Request('http://localhost/api/chat', {
          method: 'POST',
          body: JSON.stringify({
            conversationId: CONV_A_ID,
            message: 'Tell me User A secrets',
          }),
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      expect(res.status).toBe(404);
      expect(createMsgSpy).not.toHaveBeenCalled();
      expect(mockRunRagPipeline).not.toHaveBeenCalled();
    });
  });

  describe('Zod validation & safe error masking', () => {
    beforeEach(() => {
      mockRequireAuth.mockResolvedValue({ supabase: fakeSupabase, user: USER_A });
    });

    it('rejects invalid UUID params with 400 VALIDATION_ERROR', async () => {
      const res = await getDocument(
        new Request('http://localhost/api/documents/not-a-uuid'),
        { params: Promise.resolve({ id: 'not-a-uuid' }) },
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects malformed JSON and invalid chat payloads with 400', async () => {
      const badJsonRes = await postChat(
        new Request('http://localhost/api/chat', {
          method: 'POST',
          body: '{bad json',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      expect(badJsonRes.status).toBe(400);
      expect((await badJsonRes.json()).error.code).toBe('BAD_REQUEST');

      const emptyMsgRes = await postChat(
        new Request('http://localhost/api/chat', {
          method: 'POST',
          body: JSON.stringify({ conversationId: CONV_A_ID, message: '   ' }),
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      expect(emptyMsgRes.status).toBe(400);
      expect((await emptyMsgRes.json()).error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects upload without file field', async () => {
      const form = new FormData();
      const res = await uploadDocument(
        new Request('http://localhost/api/documents/upload', {
          method: 'POST',
          body: form,
        }),
      );
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
    });

    it('masks internal errors without leaking DB/stack details', async () => {
      vi.spyOn(documentsRepository, 'listByUser').mockRejectedValue(
        new Error('postgres://user:password@internal-host:5432/db failed'),
      );
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const res = await listDocuments();
      consoleSpy.mockRestore();

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(JSON.stringify(body)).not.toContain('postgres://');
      expect(JSON.stringify(body)).not.toContain('password');
    });
  });

  describe('Upload rate limit enforcement', () => {
    it('blocks uploads exceeding RATE_LIMIT_UPLOAD_PER_HOUR per user', async () => {
      // Trigger rate limit on 3rd attempt (limit is 2 in makeDefaultEnv)
      const invalidInput = {
        fileName: 'not-a-pdf.txt',
        fileSize: 10,
        mimeType: 'text/plain',
        buffer: Buffer.from('hello'),
      };

      await expect(
        documentsService.uploadDocument(fakeSupabase, USER_A.id, invalidInput),
      ).rejects.toBeInstanceOf(ZodError);

      await expect(
        documentsService.uploadDocument(fakeSupabase, USER_A.id, invalidInput),
      ).rejects.toBeInstanceOf(ZodError);

      await expect(
        documentsService.uploadDocument(fakeSupabase, USER_A.id, invalidInput),
      ).rejects.toMatchObject({ code: 'RATE_LIMITED', statusCode: 429 });

      // User B has a separate bucket and is not rate-limited
      await expect(
        documentsService.uploadDocument(fakeSupabase, USER_B.id, invalidInput),
      ).rejects.toBeInstanceOf(ZodError);
    });
  });
});
