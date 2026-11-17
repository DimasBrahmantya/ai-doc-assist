import { describe, expect, it, vi } from 'vitest';
import { AppError, handleApiError } from '@/lib/errors/app-error';
import {
  conversationIdParamSchema,
  createConversationSchema,
  updateConversationSchema,
} from '@/lib/validations/conversations';
import { documentIdParamSchema } from '@/lib/validations/documents';
import { createMessageSchema } from '@/lib/validations/messages';

describe('handleApiError', () => {
  it('maps AppError to { error: { code, message } } with status', async () => {
    const res = handleApiError(
      new AppError('NOT_FOUND', 'Document not found', 404),
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'Document not found' },
    });
  });

  it('maps ZodError to VALIDATION_ERROR 400', async () => {
    const parsed = documentIdParamSchema.safeParse({ id: 'not-a-uuid' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const res = handleApiError(parsed.error);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('id');
    }
  });

  it('masks unexpected errors without leaking stack or internals', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = handleApiError(new Error('secret db connection string'));
    spy.mockRestore();

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again later.',
      },
    });
    expect(JSON.stringify(body)).not.toContain('secret db connection string');
  });
});

describe('Zod validation schemas', () => {
  const validUuid = '11111111-1111-4111-8111-111111111111';

  it('validates conversation creation and update', () => {
    expect(
      createConversationSchema.parse({ documentId: validUuid, title: '  My Chat  ' }),
    ).toEqual({ documentId: validUuid, title: 'My Chat' });

    expect(() =>
      updateConversationSchema.parse({ title: '   ' }),
    ).toThrow();

    expect(conversationIdParamSchema.parse({ id: validUuid })).toEqual({
      id: validUuid,
    });
  });

  it('validates message creation', () => {
    const parsed = createMessageSchema.parse({
      conversationId: validUuid,
      role: 'user',
      content: 'What is on page 2?',
    });
    expect(parsed.role).toBe('user');

    expect(() =>
      createMessageSchema.parse({
        conversationId: validUuid,
        role: 'system',
        content: 'Invalid role',
      }),
    ).toThrow();
  });
});
