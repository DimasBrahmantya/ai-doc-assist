import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { parseServerEnv } from '@/lib/env';
import { parsePublicEnv } from '@/lib/env.public';

const validBase = {
  GEMINI_API_KEY: 'test-gemini-key',
  GEMINI_CHAT_MODEL: 'gemini-2.5-flash',
  GEMINI_EMBEDDING_MODEL: 'gemini-embedding-001',
  GEMINI_EMBEDDING_DIM: '768',
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  SUPABASE_STORAGE_BUCKET: 'documents',
};

describe('env validation', () => {
  it('parses valid server env with defaults for numeric limits', () => {
    const env = parseServerEnv(validBase);
    expect(env.GEMINI_API_KEY).toBe('test-gemini-key');
    expect(env.GEMINI_EMBEDDING_DIM).toBe(768);
    expect(env.MAX_UPLOAD_MB).toBe(10);
    expect(env.RAG_MIN_SIMILARITY).toBe(0.35);
    expect(env.CHUNK_SIZE_CHARS).toBe(1200);
  });

  it('fails fast when required server vars are missing', () => {
    const { GEMINI_API_KEY: _, ...missingGemini } = validBase;
    expect(() => parseServerEnv(missingGemini)).toThrow(/GEMINI_API_KEY/);
  });

  it('fails fast when NEXT_PUBLIC_SUPABASE_URL is invalid', () => {
    expect(() =>
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
      }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});
