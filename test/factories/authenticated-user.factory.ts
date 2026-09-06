import { AuthenticatedUser } from '../../src/common/auth/types/authenticated-user.type';

export function buildAuthenticatedUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'user@example.test',
    role: 'authenticated',
    aal: 'aal1',
    sessionId: 'session-123',
    provider: 'email',
    accessToken: 'test-access-token',
    issuedAt: new Date('2026-01-01T00:00:00.000Z'),
    expiresAt: new Date('2026-01-01T01:00:00.000Z'),
    ...overrides,
  };
}
