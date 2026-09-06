import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createClient } from '@supabase/supabase-js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

interface MeResponseBody {
  user: { id: string };
}

/**
 * Real integration test against a local Supabase stack (`pnpm db:start`).
 * Creates two real auth users, signs them in for real, and hits the real
 * running Nest app with their real access tokens - proving handle_new_user()
 * and profiles RLS work end to end, not just against mocks.
 *
 * Skipped unless SUPABASE_SECRET_KEY/SUPABASE_PUBLISHABLE_KEY are set (CI
 * only sets these after `supabase start` - see .github/workflows/ci.yml),
 * so `pnpm test`/`pnpm test:coverage` never depend on it. The check is a
 * synchronous env-var presence check rather than an async reachability
 * probe so it can run at `describe.skipIf` registration time.
 */
const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? '';

const canRun = Boolean(SUPABASE_SECRET_KEY) && Boolean(SUPABASE_PUBLISHABLE_KEY);

describe.skipIf(!canRun)('GET /api/v1/me (Supabase local integration)', () => {
  let app: INestApplication;
  let tokenA: string;
  let tokenB: string;
  let userAId: string;
  let userBId: string;

  function server(): Server {
    return app.getHttpServer() as Server;
  }

  beforeAll(async () => {
    const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY as string);
    const anon = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const password = 'Str0ng!Passw0rd';

    const emailA = `user-a-${randomUUID()}@example.test`;
    const emailB = `user-b-${randomUUID()}@example.test`;

    const { data: createdA } = await admin.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: { username: `user_a_${Date.now()}` },
    });
    const { data: createdB } = await admin.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      user_metadata: { username: `user_b_${Date.now()}` },
    });

    userAId = createdA.user?.id as string;
    userBId = createdB.user?.id as string;

    const { data: sessionA } = await anon.auth.signInWithPassword({ email: emailA, password });
    const { data: sessionB } = await anon.auth.signInWithPassword({ email: emailB, password });

    tokenA = sessionA.session?.access_token as string;
    tokenB = sessionB.session?.access_token as string;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY as string);
    if (userAId) await admin.auth.admin.deleteUser(userAId);
    if (userBId) await admin.auth.admin.deleteUser(userBId);
    await app.close();
  });

  it('creates a profile automatically for a new auth user (handle_new_user trigger)', async () => {
    const response = await request(server())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(response.status).toBe(200);
    expect((response.body as MeResponseBody).user.id).toBe(userAId);
  });

  it('never lets User A see User B profile data, and vice versa', async () => {
    const responseA = await request(server())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${tokenA}`);
    const responseB = await request(server())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${tokenB}`);

    const bodyA = responseA.body as MeResponseBody;
    const bodyB = responseB.body as MeResponseBody;

    expect(bodyA.user.id).toBe(userAId);
    expect(bodyB.user.id).toBe(userBId);
    expect(bodyA.user.id).not.toBe(bodyB.user.id);
  });

  it('rejects a request with no token', async () => {
    const response = await request(server()).get('/api/v1/me');
    expect(response.status).toBe(401);
  });
});
