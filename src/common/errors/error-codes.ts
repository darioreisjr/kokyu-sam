/**
 * Stable, public error codes returned in the `code` field of every error
 * response. These are part of the API contract - do not rename without a
 * version bump. See docs/security.md for the full status-code mapping.
 */
export enum ErrorCode {
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_NOT_CONFIRMED = 'EMAIL_NOT_CONFIRMED',
  USERNAME_TAKEN = 'USERNAME_TAKEN',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
