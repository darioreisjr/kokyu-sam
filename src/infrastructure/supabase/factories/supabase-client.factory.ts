import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../database.types';
import { SupabaseConfig } from '../../../config/supabase.config';

export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Anonymous/public client. Subject to RLS as the `anon` role. Safe to use
 * for operations that do not require an authenticated user.
 */
export function createPublicClient(config: SupabaseConfig): TypedSupabaseClient {
  return createClient<Database>(config.url, config.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Per-request client scoped to the caller's access token. Every query runs
 * as that user under RLS — this is the client the application should use
 * for almost everything.
 */
export function createUserScopedClient(
  config: SupabaseConfig,
  accessToken: string,
): TypedSupabaseClient {
  return createClient<Database>(config.url, config.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

/**
 * Admin client using the secret key. Bypasses RLS entirely. Exceptional
 * use only — never construct this ad hoc elsewhere, and never let it reach
 * the frontend, logs, Swagger, or test snapshots.
 */
export function createAdminClient(config: SupabaseConfig): TypedSupabaseClient {
  if (!config.secretKey) {
    throw new Error(
      'SUPABASE_SECRET_KEY is not configured. The admin client cannot be created without it.',
    );
  }

  return createClient<Database>(config.url, config.secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
