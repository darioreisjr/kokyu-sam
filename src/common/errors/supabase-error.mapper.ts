import { AppError, InternalError, ProfileNotFoundError } from './app.error';

interface SupabaseLikeError {
  code?: string | null;
  message?: string;
}

/**
 * Translates a raw Supabase/PostgREST error into a stable application
 * error. Never rethrow or return the raw Supabase error object - it may
 * contain SQL fragments or other internal details.
 */
export function mapSupabaseError(error: SupabaseLikeError): AppError {
  // PostgREST "no rows found" for a single-row query.
  if (error.code === 'PGRST116') {
    return new ProfileNotFoundError();
  }

  return new InternalError();
}
