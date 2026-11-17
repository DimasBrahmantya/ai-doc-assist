import 'server-only';
import type { User } from '@supabase/supabase-js';
import { AppError } from '@/lib/errors/app-error';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function getSessionUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }
  return user;
}

export async function requireAuth() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
  }

  return { supabase, user };
}
