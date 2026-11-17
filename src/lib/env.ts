import 'server-only';
import { z } from 'zod';

const positiveInt = (fallback: number) =>
  z.coerce.number().int().positive().default(fallback);

export const serverEnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_CHAT_MODEL: z.string().min(1).default('gemini-3.5-flash-lite'),
  GEMINI_EMBEDDING_MODEL: z.string().min(1).default('gemini-embedding-001'),
  GEMINI_EMBEDDING_DIM: positiveInt(768),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default('documents'),

  MAX_UPLOAD_MB: positiveInt(10),
  MAX_PDF_PAGES: positiveInt(200),
  RAG_TOP_K: positiveInt(6),
  RAG_MIN_SIMILARITY: z.coerce.number().min(0).max(1).default(0.35),
  CHUNK_SIZE_CHARS: positiveInt(1200),
  CHUNK_OVERLAP_CHARS: z.coerce.number().int().min(0).default(200),
  RATE_LIMIT_CHAT_PER_MIN: positiveInt(20),
  RATE_LIMIT_UPLOAD_PER_HOUR: positiveInt(10),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(raw: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid server environment configuration: ${issues}`);
  }
  return result.data;
}

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (!cachedEnv) {
    cachedEnv = parseServerEnv(process.env);
  }
  return cachedEnv;
}
