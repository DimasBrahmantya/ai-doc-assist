import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env';

let adminClient: ReturnType<typeof createClient> | null = null;

/**
 * Service-role Supabase client. Bypasses RLS.
 * Server-only: restrict to narrow administrative tasks (e.g. storage cleanup, tests).
 */
export function createAdminSupabaseClient() {
  if (!adminClient) {
    const env = getServerEnv();
    adminClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }
  return adminClient;
}
