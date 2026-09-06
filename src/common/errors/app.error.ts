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
