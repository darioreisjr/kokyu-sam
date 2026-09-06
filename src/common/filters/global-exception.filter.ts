import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { AppError } from '../errors/app.error';
import { ErrorCode } from '../errors/error-codes';
import { ProblemDetails } from './problem-details.interface';

type RequestWithId = Request & { id?: unknown };

const TITLES_BY_CODE: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_REQUIRED]: 'Authentication required',
  [ErrorCode.TOKEN_INVALID]: 'Invalid token',
  [ErrorCode.TOKEN_EXPIRED]: 'Token expired',
  [ErrorCode.INVALID_CREDENTIALS]: 'Invalid credentials',
  [ErrorCode.EMAIL_NOT_CONFIRMED]: 'Email not confirmed',
  [ErrorCode.USERNAME_TAKEN]: 'Username already taken',
  [ErrorCode.VALIDATION_ERROR]: 'Validation error',
  [ErrorCode.PROFILE_NOT_FOUND]: 'Profile not found',
  [ErrorCode.RATE_LIMITED]: 'Too many requests',
  [ErrorCode.INTERNAL_ERROR]: 'Internal server error',
};

/**
 * Translates every thrown error into a Problem-Details-shaped response.
 * Never forwards stack traces, SQL, Supabase internals, or environment
 * details to the client - unexpected errors are logged server-side and
 * reduced to a generic INTERNAL_ERROR for the caller.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const requestId = this.extractRequestId(request);

    const { status, code, detail } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error({ err: exception, requestId }, 'Unhandled exception');
    }

    const problem: ProblemDetails = {
      type: `https://docs.kokyu.app/errors/${code}`,
      title: TITLES_BY_CODE[code],
      status,
      code,
      detail,
      instance: request.url,
      requestId,
    };

    response.status(status).json(problem);
  }

  private extractRequestId(request: RequestWithId): string {
    return typeof request.id === 'string' || typeof request.id === 'number'
      ? String(request.id)
      : '';
  }

  private resolve(exception: unknown): { status: HttpStatus; code: ErrorCode; detail: string } {
    if (exception instanceof AppError) {
      return { status: exception.status, code: exception.code, detail: exception.message };
    }

    if (exception instanceof HttpException) {
      const status: HttpStatus = exception.getStatus();
      const code =
        status === HttpStatus.TOO_MANY_REQUESTS
          ? ErrorCode.RATE_LIMITED
          : ErrorCode.VALIDATION_ERROR;
      const response = exception.getResponse();
      const detail =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] }).message ?? exception.message);
      return {
        status,
        code,
        detail: Array.isArray(detail) ? detail.join(', ') : detail,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      detail: 'An unexpected error occurred.',
    };
  }
}
