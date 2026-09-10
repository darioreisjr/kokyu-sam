import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes';

/**
 * Base class for every domain error the application throws deliberately.
 * The global exception filter maps these to RFC 7807 Problem Details
 * responses without ever leaking internal details (stack traces, SQL,
 * Supabase internals).
 */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: HttpStatus,
    message: string,
    /**
     * Optional RFC 7807 extension members merged into the response body
     * (e.g. `redirectTo`, `missingFields`). Keep this small and public -
     * never put internal details here, only values already safe to expose.
     */
    public readonly extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthRequiredError extends AppError {
  constructor(message = 'Authentication is required.') {
    super(ErrorCode.AUTH_REQUIRED, HttpStatus.UNAUTHORIZED, message);
  }
}

export class TokenInvalidError extends AppError {
  constructor(message = 'The provided access token is invalid.') {
    super(ErrorCode.TOKEN_INVALID, HttpStatus.UNAUTHORIZED, message);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = 'The provided access token has expired.') {
    super(ErrorCode.TOKEN_EXPIRED, HttpStatus.UNAUTHORIZED, message);
  }
}

export class ProfileNotFoundError extends AppError {
  constructor(message = 'Profile not found.') {
    super(ErrorCode.PROFILE_NOT_FOUND, HttpStatus.NOT_FOUND, message);
  }
}

export class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred.') {
    super(ErrorCode.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR, message);
  }
}

export class UsernameTakenError extends AppError {
  constructor(message = 'This username is already taken.') {
    super(ErrorCode.USERNAME_TAKEN, HttpStatus.CONFLICT, message);
  }
}

export class UsernameInvalidError extends AppError {
  constructor(message = 'Invalid username.') {
    super(ErrorCode.USERNAME_INVALID, HttpStatus.BAD_REQUEST, message);
  }
}

export class BirthDateInvalidError extends AppError {
  constructor(message = 'Invalid birth date.') {
    super(ErrorCode.BIRTH_DATE_INVALID, HttpStatus.BAD_REQUEST, message);
  }
}

export class AgeRequirementNotMetError extends AppError {
  constructor(message = 'You must be at least 18 years old.') {
    super(ErrorCode.AGE_REQUIREMENT_NOT_MET, HttpStatus.BAD_REQUEST, message);
  }
}

export class ProfileValidationError extends AppError {
  constructor(message = 'The profile could not be updated with the provided data.') {
    super(ErrorCode.PROFILE_VALIDATION_ERROR, HttpStatus.BAD_REQUEST, message);
  }
}

export class AvatarInvalidError extends AppError {
  constructor(message = 'Invalid avatar file.') {
    super(ErrorCode.AVATAR_INVALID, HttpStatus.BAD_REQUEST, message);
  }
}

export class AvatarTooLargeError extends AppError {
  constructor(message = 'Avatar file is too large.') {
    super(ErrorCode.AVATAR_TOO_LARGE, HttpStatus.BAD_REQUEST, message);
  }
}

/**
 * Thrown by ProfileCompleteGuard when a caller with an incomplete profile
 * hits a business route that isn't `@AllowIncompleteProfile()`. Carries
 * `redirectTo` as an RFC 7807 extension member so the frontend can route
 * the user straight to onboarding without special-casing the error code.
 */
export class ProfileSetupRequiredError extends AppError {
  constructor(redirectTo = '/perfil/completar', message = 'Profile setup is required.') {
    super(ErrorCode.PROFILE_SETUP_REQUIRED, HttpStatus.FORBIDDEN, message, { redirectTo });
  }
}

export class LeisureItemNotFoundError extends AppError {
  constructor(message = 'Leisure item not found.') {
    super(ErrorCode.LEISURE_ITEM_NOT_FOUND, HttpStatus.NOT_FOUND, message);
  }
}

export class LeisureItemDetailsInvalidError extends AppError {
  constructor(message = 'Leisure item details are invalid for this item type.') {
    super(ErrorCode.LEISURE_ITEM_DETAILS_INVALID, HttpStatus.BAD_REQUEST, message);
  }
}

export class LeisurePlanEntryNotFoundError extends AppError {
  constructor(message = 'Leisure plan entry not found.') {
    super(ErrorCode.LEISURE_PLAN_ENTRY_NOT_FOUND, HttpStatus.NOT_FOUND, message);
  }
}

/** Thrown when a plan entry's date/startTime/endTime is a new pick that lands in the past — see `findPastPlanEntryViolation`. */
export class LeisurePlanEntryDateInvalidError extends AppError {
  constructor(message = 'Plan entry date/time cannot be in the past.') {
    super(ErrorCode.LEISURE_PLAN_ENTRY_DATE_INVALID, HttpStatus.BAD_REQUEST, message);
  }
}

export class LeisureNoteNotFoundError extends AppError {
  constructor(message = 'Leisure note not found.') {
    super(ErrorCode.LEISURE_NOTE_NOT_FOUND, HttpStatus.NOT_FOUND, message);
  }
}

export class LeisureCollectionNotFoundError extends AppError {
  constructor(message = 'Leisure collection not found.') {
    super(ErrorCode.LEISURE_COLLECTION_NOT_FOUND, HttpStatus.NOT_FOUND, message);
  }
}
