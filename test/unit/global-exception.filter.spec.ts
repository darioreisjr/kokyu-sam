import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';
import {
  AuthRequiredError,
  InternalError,
  ProfileSetupRequiredError,
} from '../../src/common/errors/app.error';
import { ErrorCode } from '../../src/common/errors/error-codes';

function buildHost(request: Record<string, unknown>) {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const response = { status };

  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

function buildLogger() {
  return { setContext: vi.fn(), error: vi.fn() } as unknown as ConstructorParameters<
    typeof GlobalExceptionFilter
  >[0];
}

describe('GlobalExceptionFilter', () => {
  it('maps an AppError to its own status/code/message', () => {
    const logger = buildLogger();
    const filter = new GlobalExceptionFilter(logger);
    const { host, status, json } = buildHost({ id: 'req-1', url: '/api/v1/me' });

    filter.catch(new AuthRequiredError(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.AUTH_REQUIRED,
        requestId: 'req-1',
        instance: '/api/v1/me',
      }),
    );
  });

  it('maps a NestJS HttpException to VALIDATION_ERROR by default', () => {
    const logger = buildLogger();
    const filter = new GlobalExceptionFilter(logger);
    const { host, status, json } = buildHost({ id: 'req-2', url: '/api/v1/me' });

    filter.catch(new BadRequestException('email: Invalid email'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: ErrorCode.VALIDATION_ERROR, detail: 'email: Invalid email' }),
    );
  });

  it('reduces an unknown thrown value to a generic INTERNAL_ERROR and logs it server-side', () => {
    const logger = buildLogger();
    const filter = new GlobalExceptionFilter(logger);
    const { host, status, json } = buildHost({ id: 'req-3', url: '/api/v1/me' });

    filter.catch(new Error('a raw SQL error message leaked from a driver'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.INTERNAL_ERROR,
        detail: 'An unexpected error occurred.',
      }),
    );
    expect((logger as unknown as { error: ReturnType<typeof vi.fn> }).error).toHaveBeenCalled();
  });

  it('merges an AppError.extra payload (e.g. redirectTo) as RFC 7807 extension members', () => {
    const logger = buildLogger();
    const filter = new GlobalExceptionFilter(logger);
    const { host, status, json } = buildHost({ id: 'req-4', url: '/api/v1/missions' });

    filter.catch(new ProfileSetupRequiredError(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.PROFILE_SETUP_REQUIRED,
        redirectTo: '/perfil/completar',
      }),
    );
  });

  it('falls back to an empty requestId when the request has none', () => {
    const logger = buildLogger();
    const filter = new GlobalExceptionFilter(logger);
    const { host, json } = buildHost({ url: '/api/v1/me' });

    filter.catch(new InternalError(), host);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({ requestId: '' }));
  });
});
