import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { SupabaseAuthGuard } from '../../src/common/auth/guards/supabase-auth.guard';
import {
  AuthRequiredError,
  TokenExpiredError,
  TokenInvalidError,
} from '../../src/common/errors/app.error';
import { createFakeAuthClient } from '../factories/fake-supabase-client';

function buildContext(headers: Record<string, string | undefined>): ExecutionContext {
  const request = { headers, user: undefined as unknown };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function buildGuard(getClaimsResult: Parameters<typeof createFakeAuthClient>[0], isPublic = false) {
  const reflector = { getAllAndOverride: () => isPublic } as unknown as Reflector;
  const supabase = {
    getPublicClient: () => createFakeAuthClient(getClaimsResult),
  } as unknown as ConstructorParameters<typeof SupabaseAuthGuard>[1];

  return new SupabaseAuthGuard(reflector, supabase);
}

describe('SupabaseAuthGuard', () => {
  it('allows a @Public() route without checking the header', async () => {
    const guard = buildGuard({ data: null, error: { message: 'unused' } }, true);
    const context = buildContext({});

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects a request with no Authorization header', async () => {
    const guard = buildGuard({ data: null, error: null });
    const context = buildContext({});

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it('rejects an empty Bearer token', async () => {
    const guard = buildGuard({ data: null, error: null });
    const context = buildContext({ authorization: 'Bearer    ' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it('rejects a non-Bearer Authorization header', async () => {
    const guard = buildGuard({ data: null, error: null });
    const context = buildContext({ authorization: 'Basic abc123' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it('maps a Supabase "expired" error to TokenExpiredError', async () => {
    const guard = buildGuard({ data: null, error: { message: 'jwt is expired' } });
    const context = buildContext({ authorization: 'Bearer expired-token' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(TokenExpiredError);
  });

  it('maps any other Supabase verification error to TokenInvalidError', async () => {
    const guard = buildGuard({ data: null, error: { message: 'invalid signature' } });
    const context = buildContext({ authorization: 'Bearer bad-token' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(TokenInvalidError);
  });

  it('rejects claims missing a subject', async () => {
    const guard = buildGuard({ data: { claims: { role: 'authenticated' } }, error: null });
    const context = buildContext({ authorization: 'Bearer no-sub' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(TokenInvalidError);
  });

  it('rejects claims whose exp has already passed, even without a Supabase error', async () => {
    const pastExp = Math.floor(Date.now() / 1000) - 60;
    const guard = buildGuard({
      data: { claims: { sub: 'user-1', exp: pastExp } },
      error: null,
    });
    const context = buildContext({ authorization: 'Bearer stale-token' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(TokenExpiredError);
  });

  it('attaches an AuthenticatedUser to the request for a valid token', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const guard = buildGuard({
      data: {
        claims: {
          sub: 'user-1',
          email: 'user@example.test',
          role: 'authenticated',
          aal: 'aal1',
          session_id: 'sess-1',
          exp: futureExp,
          app_metadata: { provider: 'google' },
        },
      },
      error: null,
    });
    const request = { headers: { authorization: 'Bearer good-token' }, user: undefined as unknown };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toMatchObject({
      id: 'user-1',
      email: 'user@example.test',
      provider: 'google',
      accessToken: 'good-token',
    });
  });
});
