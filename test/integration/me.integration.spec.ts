import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createClient } from '@supabase/supabase-js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

interface CurrentUserBody {
  id: string;
  profile: { username: string | null };
  profileCompletion: { completed: boolean; missingFields: string[] };
  access: { canUseApplication: boolean; redirectTo: string | null };
}

/**
 * Real integration test against a local Supabase stack (`pnpm db:start`).
 * Creates real auth users, signs them in for real, and hits the real
 * running Nest app with their real access tokens - proving handle_new_user(),
 * profiles RLS, the onboarding RPCs and ProfileCompleteGuard all work end
 * to end, not just against mocks.
 *
 * Skipped unless SUPABASE_SECRET_KEY/SUPABASE_PUBLISHABLE_KEY are set (CI
 * only sets these after `supabase start`), so `pnpm test`/`pnpm
 * test:coverage` never depend on it. The check is a synchronous env-var
 * presence check rather than an async reachability probe so it can run at
 * `describe.skipIf` registration time.
 */
const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? '';

const canRun = Boolean(SUPABASE_SECRET_KEY) && Boolean(SUPABASE_PUBLISHABLE_KEY);

describe.skipIf(!canRun)('Profile onboarding (Supabase local integration)', () => {
  let app: INestApplication;
  const createdUserIds: string[] = [];

  function server(): Server {
    return app.getHttpServer() as Server;
  }

  async function createConfirmedUser(userMetadata: Record<string, unknown> = {}) {
    const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY as string);
    const anon = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const password = 'Str0ng!Passw0rd';
    const email = `user-${randomUUID()}@example.test`;

    const { data: created } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });
    const userId = created.user?.id as string;
    createdUserIds.push(userId);

    const { data: session } = await anon.auth.signInWithPassword({ email, password });
    return { userId, accessToken: session.session?.access_token as string };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY as string);
    await Promise.all(createdUserIds.map((id) => admin.auth.admin.deleteUser(id)));
    await app.close();
  });

  it('creates a profile automatically for a new auth user (handle_new_user trigger)', async () => {
    const { userId, accessToken } = await createConfirmedUser();

    const response = await request(server())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect((response.body as CurrentUserBody).id).toBe(userId);
  });

  it('rejects a request with no token', async () => {
    const response = await request(server()).get('/api/v1/me');
    expect(response.status).toBe(401);
  });

  it('never lets User A see User B profile data, and vice versa', async () => {
    const userA = await createConfirmedUser();
    const userB = await createConfirmedUser();

    const responseA = await request(server())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${userA.accessToken}`);
    const responseB = await request(server())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${userB.accessToken}`);

    expect((responseA.body as CurrentUserBody).id).toBe(userA.userId);
    expect((responseB.body as CurrentUserBody).id).toBe(userB.userId);
    expect((responseA.body as CurrentUserBody).id).not.toBe((responseB.body as CurrentUserBody).id);
  });

  it('full email onboarding flow: incomplete /me -> guard blocks a business route -> complete -> /me complete -> business route unblocked', async () => {
    const { accessToken } = await createConfirmedUser();
    const username = `user_${Date.now()}`;

    const meBefore = await request(server())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(meBefore.status).toBe(200);
    expect((meBefore.body as CurrentUserBody).profileCompletion.completed).toBe(false);
    expect((meBefore.body as CurrentUserBody).access.canUseApplication).toBe(false);

    // PATCH /profile is a regular business route (not @AllowIncompleteProfile()) -
    // ProfileCompleteGuard must block it while onboarding is incomplete.
    const blocked = await request(server())
      .patch('/api/v1/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        username,
        birthDate: '1990-01-01',
      });
    expect(blocked.status).toBe(403);
    expect((blocked.body as { code: string }).code).toBe('PROFILE_SETUP_REQUIRED');
    expect((blocked.body as { redirectTo: string }).redirectTo).toBe('/perfil/completar');

    const completed = await request(server())
      .post('/api/v1/profile/complete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        username,
        birthDate: '1990-01-01',
      });
    expect(completed.status).toBe(201);
    expect((completed.body as CurrentUserBody).profileCompletion.completed).toBe(true);
    expect((completed.body as CurrentUserBody).access.canUseApplication).toBe(true);

    const meAfter = await request(server())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect((meAfter.body as CurrentUserBody).profileCompletion.completed).toBe(true);
    expect((meAfter.body as CurrentUserBody).profile.username).toBe(username);

    // Now the same business route succeeds.
    const unblocked = await request(server())
      .patch('/api/v1/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        username,
        birthDate: '1990-01-01',
        bio: 'Mathematician',
      });
    expect(unblocked.status).toBe(200);
    expect((unblocked.body as { profile: { bio: string } }).profile.bio).toBe('Mathematician');
  });

  it('completing again with the same valid data is idempotent (no error, same completed state)', async () => {
    const { accessToken } = await createConfirmedUser();
    const username = `user_${Date.now()}_idem`;
    const payload = { firstName: 'Ada', lastName: 'Lovelace', username, birthDate: '1990-01-01' };

    const first = await request(server())
      .post('/api/v1/profile/complete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload);
    expect(first.status).toBe(201);

    const second = await request(server())
      .post('/api/v1/profile/complete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload);
    expect(second.status).toBe(201);
    expect((second.body as CurrentUserBody).profileCompletion.completed).toBe(true);
  });

  it('Google-like identity: bootstraps first/last name and avatar from user_metadata, never overwrites on a later /me call', async () => {
    const { accessToken } = await createConfirmedUser({
      given_name: 'Grace',
      family_name: 'Hopper',
      picture: 'https://example.test/avatar.png',
    });

    const first = await request(server())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(first.status).toBe(200);
    const firstBody = first.body as {
      profile: { firstName: string; lastName: string; avatarUrl: string };
    };
    expect(firstBody.profile.firstName).toBe('Grace');
    expect(firstBody.profile.lastName).toBe('Hopper');
    expect(firstBody.profile.avatarUrl).toBe('https://example.test/avatar.png');

    const second = await request(server())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`);
    const secondBody = second.body as { profile: { firstName: string; lastName: string } };
    expect(secondBody.profile.firstName).toBe('Grace');
    expect(secondBody.profile.lastName).toBe('Hopper');
  });

  it('rejects taking a username that is already in use (case-insensitive)', async () => {
    const userA = await createConfirmedUser();
    const userB = await createConfirmedUser();
    const username = `race_${Date.now()}`;

    const first = await request(server())
      .post('/api/v1/profile/complete')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ firstName: 'A', lastName: 'A', username, birthDate: '1990-01-01' });
    expect(first.status).toBe(201);

    const second = await request(server())
      .post('/api/v1/profile/complete')
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({
        firstName: 'B',
        lastName: 'B',
        username: username.toUpperCase(),
        birthDate: '1990-01-01',
      });

    expect(second.status).toBe(409);
    expect((second.body as { code: string }).code).toBe('USERNAME_TAKEN');
  });

  it('GET /usernames/availability is public and never reveals ownership', async () => {
    const { accessToken } = await createConfirmedUser();
    const username = `avail_${Date.now()}`;

    await request(server())
      .post('/api/v1/profile/complete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ firstName: 'A', lastName: 'A', username, birthDate: '1990-01-01' });

    const noAuth = await request(server()).get(
      `/api/v1/usernames/availability?username=${username}`,
    );
    expect(noAuth.status).toBe(200);
    expect((noAuth.body as { available: boolean }).available).toBe(false);
    expect(noAuth.body).not.toHaveProperty('owner');
    expect(noAuth.body).not.toHaveProperty('userId');

    const free = await request(server()).get(
      `/api/v1/usernames/availability?username=free_${Date.now()}`,
    );
    expect((free.body as { available: boolean }).available).toBe(true);
  });

  it('avatar flow: upload-url is scoped to the caller, setAvatar persists it, removeAvatar clears it', async () => {
    const { userId, accessToken } = await createConfirmedUser();

    const uploadUrl = await request(server())
      .post('/api/v1/profile/avatar/upload-url')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ contentType: 'image/png' });
    expect(uploadUrl.status).toBe(201);
    const target = uploadUrl.body as { path: string; token: string; signedUrl: string };
    expect(target.path.startsWith(`${userId}/`)).toBe(true);

    // Actually PUT a tiny file to the signed URL so setAvatar's path is real.
    // `signedUrl` from createSignedUploadUrl() is already the exact URL/path
    // (with token) to upload to - never reconstructed by hand.
    const uploadTarget = target.signedUrl.startsWith('http')
      ? target.signedUrl
      : `${SUPABASE_URL}${target.signedUrl}`;
    const putResponse = await fetch(uploadTarget, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    });
    expect(putResponse.status).toBeLessThan(300);

    const setAvatar = await request(server())
      .patch('/api/v1/profile/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ path: target.path });
    expect(setAvatar.status).toBe(200);
    const setBody = setAvatar.body as { profile: { avatarUrl: string | null } };
    expect(setBody.profile.avatarUrl).not.toBeNull();

    const removeAvatar = await request(server())
      .delete('/api/v1/profile/avatar')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(removeAvatar.status).toBe(200);
    expect(
      (removeAvatar.body as { profile: { avatarUrl: string | null } }).profile.avatarUrl,
    ).toBeNull();
  });

  it('rejects an avatar path that does not belong to the caller (mass-assignment / path spoofing)', async () => {
    const userA = await createConfirmedUser();
    const userB = await createConfirmedUser();

    const response = await request(server())
      .patch('/api/v1/profile/avatar')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ path: `${userB.userId}/spoofed.png` });

    expect(response.status).toBe(400);
    expect((response.body as { code: string }).code).toBe('AVATAR_INVALID');
  });
});
