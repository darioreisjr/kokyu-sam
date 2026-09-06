import type { Server } from 'node:http';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { SupabaseClientFactoryService } from '../../src/infrastructure/supabase/supabase-client.factory.service';
import { createFakeProfilesClient } from '../factories/fake-supabase-client';

interface ErrorBody {
  code: string;
}

interface MeResponseBody {
  user: { id: string };
  profile: { username: string | null };
}

interface FakeUser {
  id: string;
  profile: Record<string, unknown>;
}

const USER_A: FakeUser = {
  id: '11111111-1111-1111-1111-111111111111',
  profile: {
    id: '11111111-1111-1111-1111-111111111111',
    first_name: 'User',
    last_name: 'A',
    username: 'user_a',
    birth_date: '1990-01-01',
    avatar_url: null,
    onboarding_complete: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
};

const USER_B: FakeUser = {
  id: '22222222-2222-2222-2222-222222222222',
  profile: {
    id: '22222222-2222-2222-2222-222222222222',
    first_name: 'User',
    last_name: 'B',
    username: 'user_b',
    birth_date: '1992-02-02',
    avatar_url: null,
    onboarding_complete: false,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
};

const USERS_BY_TOKEN: Record<string, FakeUser> = {
  'token-user-a': USER_A,
  'token-user-b': USER_B,
};

/**
 * A fake SupabaseClientFactoryService standing in for a real Supabase
 * project. It resolves `getPublicClient().auth.getClaims(token)` and
 * `getUserScopedClient(token)` deterministically from the fixed token map
 * above, so these e2e tests exercise the full HTTP stack (guard, filter,
 * versioning, DI) without requiring `supabase start`. Real Supabase wiring
 * is covered separately in test/integration.
 */
class FakeSupabaseClientFactoryService {
  getPublicClient() {
    return {
      auth: {
        getClaims: (token: string) => {
          const user = USERS_BY_TOKEN[token];

          if (!user) {
            return Promise.resolve({ data: null, error: { message: 'invalid token' } });
          }

          return Promise.resolve({
            data: {
              claims: { sub: user.id, role: 'authenticated', email: `${user.id}@example.test` },
            },
            error: null,
          });
        },
      },
    };
  }

  getUserScopedClient(token: string) {
    const user = USERS_BY_TOKEN[token];
    return createFakeProfilesClient({ data: user?.profile ?? null, error: null });
  }
}

describe('Kokyu API (e2e)', () => {
  let app: INestApplication;

  function server(): Server {
    return app.getHttpServer() as Server;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SupabaseClientFactoryService)
      .useClass(FakeSupabaseClientFactoryService)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health returns 200', async () => {
    const response = await request(server()).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
  });

  it('GET /api/v1/me without a token returns 401 AUTH_REQUIRED', async () => {
    const response = await request(server()).get('/api/v1/me');

    expect(response.status).toBe(401);
    expect((response.body as ErrorBody).code).toBe('AUTH_REQUIRED');
  });

  it('GET /api/v1/me with an invalid token returns 401 TOKEN_INVALID', async () => {
    const response = await request(server())
      .get('/api/v1/me')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(response.status).toBe(401);
    expect((response.body as ErrorBody).code).toBe('TOKEN_INVALID');
  });

  it('GET /api/v1/me with User A token returns User A profile only', async () => {
    const response = await request(server())
      .get('/api/v1/me')
      .set('Authorization', 'Bearer token-user-a');

    const body = response.body as MeResponseBody;
    expect(response.status).toBe(200);
    expect(body.user.id).toBe(USER_A.id);
    expect(body.profile.username).toBe('user_a');
  });

  it('GET /api/v1/me with User B token returns User B profile only', async () => {
    const response = await request(server())
      .get('/api/v1/me')
      .set('Authorization', 'Bearer token-user-b');

    const body = response.body as MeResponseBody;
    expect(response.status).toBe(200);
    expect(body.user.id).toBe(USER_B.id);
    expect(body.profile.username).toBe('user_b');
  });

  it('never returns a token, secret, or password field in the /me response', async () => {
    const response = await request(server())
      .get('/api/v1/me')
      .set('Authorization', 'Bearer token-user-a');

    const serialized = JSON.stringify(response.body).toLowerCase();
    expect(serialized).not.toContain('token');
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('password');
  });

  it('rejects a disallowed CORS origin', async () => {
    const response = await request(server())
      .get('/api/health')
      .set('Origin', 'https://evil.example.com');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows an allowlisted CORS origin', async () => {
    const response = await request(server())
      .get('/api/health')
      .set('Origin', 'http://localhost:3001');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3001');
  });

  it('sends security headers from Helmet', async () => {
    const response = await request(server()).get('/api/health');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});
