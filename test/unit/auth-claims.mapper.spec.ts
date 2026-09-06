import { describe, expect, it } from 'vitest';
import {
  extractProvider,
  mapClaimsToAuthenticatedUser,
} from '../../src/modules/auth/services/auth-claims.mapper';

describe('mapClaimsToAuthenticatedUser', () => {
  it('maps a full claim set to an AuthenticatedUser', () => {
    const user = mapClaimsToAuthenticatedUser(
      {
        sub: 'user-1',
        email: 'user@example.test',
        role: 'authenticated',
        aal: 'aal1',
        session_id: 'sess-1',
        iat: 1_700_000_000,
        exp: 1_700_003_600,
        app_metadata: { provider: 'google' },
      },
      'token-abc',
    );

    expect(user).toEqual({
      id: 'user-1',
      email: 'user@example.test',
      role: 'authenticated',
      aal: 'aal1',
      sessionId: 'sess-1',
      provider: 'google',
      accessToken: 'token-abc',
      issuedAt: new Date(1_700_000_000 * 1000),
      expiresAt: new Date(1_700_003_600 * 1000),
    });
  });

  it('defaults role to "authenticated" and provider to "email" when absent', () => {
    const user = mapClaimsToAuthenticatedUser({ sub: 'user-1' }, 'token-abc');

    expect(user.role).toBe('authenticated');
    expect(user.provider).toBe('email');
  });

  it('throws when the subject claim is missing', () => {
    expect(() => mapClaimsToAuthenticatedUser({}, 'token-abc')).toThrow();
  });
});

describe('extractProvider', () => {
  it('reads app_metadata.provider', () => {
    expect(extractProvider({ app_metadata: { provider: 'google' } })).toBe('google');
  });

  it('falls back to "email" when app_metadata is absent', () => {
    expect(extractProvider({})).toBe('email');
  });
});
