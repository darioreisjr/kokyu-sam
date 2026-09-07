import {
  AppError,
  InternalError,
  ProfileNotFoundError,
  ProfileValidationError,
  UsernameTakenError,
} from './app.error';

interface SupabaseLikeError {
  code?: string | null;
  message?: string;
}

/**
 * Postgres exception codes (SQLSTATE) raised deliberately by the
 * complete_profile/update_profile RPCs (see supabase/migrations) to signal
 * "already onboarding-complete, refusing to null out a required field".
 * Kept out of the standard Postgres SQLSTATE space (which is why it starts
 * with "KO" rather than a class already used by Postgres).
 */
const PROFILE_VALIDATION_SQLSTATE = 'KO001';

/** Postgres unique_violation SQLSTATE. */
const UNIQUE_VIOLATION_SQLSTATE = '23505';

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

  if (error.code === UNIQUE_VIOLATION_SQLSTATE) {
    return new UsernameTakenError();
  }

  if (error.code === PROFILE_VALIDATION_SQLSTATE) {
    return new ProfileValidationError();
  }

  return new InternalError();
}
