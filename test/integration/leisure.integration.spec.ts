import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createClient } from '@supabase/supabase-js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

/**
 * Real integration test against a local Supabase stack (`pnpm db:start`).
 * Creates real auth users, signs them in for real, and hits the real
 * running Nest app with their real access tokens - proving the leisure
 * migrations, RLS policies, and every leisure controller/service/repository
 * work end to end, not just against mocks. Same skip condition and pattern
 * as test/integration/me.integration.spec.ts.
 */
const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? '';

const canRun = Boolean(SUPABASE_SECRET_KEY) && Boolean(SUPABASE_PUBLISHABLE_KEY);

interface LeisureItemBody {
  id: string;
  type: string;
  title: string;
  favorite: boolean;
  status: string;
  movie?: { runtime?: number };
  book?: { currentPage?: number; author?: string };
  custom?: Record<string, unknown>;
  place?: { category: string };
}

interface PlanEntryBody {
  id: string;
  title: string;
  date: string;
  completed: boolean;
}

interface LogEntryBody {
  id: string;
  title: string;
}

interface NoteBody {
  id: string;
  pinned: boolean;
  checklistItems?: { id: string; checked: boolean }[];
}

interface CollectionBody {
  id: string;
  itemIds: string[];
}

interface SummaryBody {
  plannedToday: { id: string; title: string; type: string } | null;
  inProgress: { id: string; title: string; type: string } | null;
  backlogCount: number;
}

describe.skipIf(!canRun)('Leisure (Supabase local integration)', () => {
  let app: INestApplication;
  const createdUserIds: string[] = [];

  function server(): Server {
    return app.getHttpServer() as Server;
  }

  /**
   * Every leisure route is a regular business route (not
   * `@AllowIncompleteProfile()`), so ProfileCompleteGuard rejects it with
   * 403 PROFILE_SETUP_REQUIRED until onboarding is complete - mirrors the
   * "complete -> business route unblocked" step in me.integration.spec.ts.
   */
  async function createConfirmedUser() {
    const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY as string);
    const anon = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const password = 'Str0ng!Passw0rd';
    const email = `leisure-user-${randomUUID()}@example.test`;

    const { data: created } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    const userId = created.user?.id as string;
    createdUserIds.push(userId);

    const { data: session } = await anon.auth.signInWithPassword({ email, password });
    const accessToken = session.session?.access_token as string;

    await request(server())
      .post('/api/v1/profile/complete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        firstName: 'Test',
        lastName: 'User',
        username: `leisure_${randomUUID().replace(/-/g, '').slice(0, 20)}`,
        birthDate: '1990-01-01',
      });

    return { userId, accessToken };
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

  it('full leisure item lifecycle: create -> list -> get -> update -> favorite -> progress -> archive -> delete', async () => {
    const { accessToken } = await createConfirmedUser();
    const auth = (req: request.Test) => req.set('Authorization', `Bearer ${accessToken}`);

    const created = await auth(request(server()).post('/api/v1/leisure/items')).send({
      type: 'book',
      title: 'Hiperfoco',
      status: 'inProgress',
      durationType: 'flexible',
      tags: ['leitura'],
      book: { author: 'Someone', pages: 300, currentPage: 10 },
    });
    expect(created.status).toBe(201);
    const item = created.body as LeisureItemBody;
    expect(item.type).toBe('book');
    expect(item.book?.author).toBe('Someone');

    const listed = await auth(request(server()).get('/api/v1/leisure/items'));
    expect(listed.status).toBe(200);
    expect((listed.body as LeisureItemBody[]).some((entry) => entry.id === item.id)).toBe(true);

    const fetched = await auth(request(server()).get(`/api/v1/leisure/items/${item.id}`));
    expect(fetched.status).toBe(200);
    expect((fetched.body as LeisureItemBody).title).toBe('Hiperfoco');

    const updated = await auth(request(server()).patch(`/api/v1/leisure/items/${item.id}`)).send({
      title: 'Hiperfoco (2a leitura)',
    });
    expect(updated.status).toBe(200);
    expect((updated.body as LeisureItemBody).title).toBe('Hiperfoco (2a leitura)');

    const favorited = await auth(
      request(server()).post(`/api/v1/leisure/items/${item.id}/favorite`),
    );
    expect(favorited.status).toBe(201);
    expect((favorited.body as LeisureItemBody).favorite).toBe(true);

    const progressed = await auth(
      request(server()).patch(`/api/v1/leisure/items/${item.id}/progress`),
    ).send({ progress: { currentPage: 155 } });
    expect(progressed.status).toBe(200);
    expect((progressed.body as LeisureItemBody).book?.currentPage).toBe(155);
    // Progress merges into the existing slice - it never drops sibling fields.
    expect((progressed.body as LeisureItemBody).book?.author).toBe('Someone');

    const archived = await auth(request(server()).post(`/api/v1/leisure/items/${item.id}/archive`));
    expect(archived.status).toBe(201);
    expect((archived.body as LeisureItemBody).status).toBe('archived');

    const deleted = await auth(request(server()).delete(`/api/v1/leisure/items/${item.id}`));
    expect(deleted.status).toBe(204);

    const afterDelete = await auth(request(server()).get(`/api/v1/leisure/items/${item.id}`));
    expect(afterDelete.status).toBe(404);
    expect((afterDelete.body as { code: string }).code).toBe('LEISURE_ITEM_NOT_FOUND');
  });

  it('reclassifies a Quick Capture ("unsorted") item into a real type', async () => {
    const { accessToken } = await createConfirmedUser();
    const auth = (req: request.Test) => req.set('Authorization', `Bearer ${accessToken}`);

    const created = await auth(request(server()).post('/api/v1/leisure/items')).send({
      type: 'unsorted',
      title: 'Algo que o Joao recomendou',
      durationType: 'unknown',
      unsorted: {},
    });
    expect(created.status).toBe(201);
    const item = created.body as LeisureItemBody;

    const reclassified = await auth(
      request(server()).post(`/api/v1/leisure/items/${item.id}/reclassify`),
    ).send({ type: 'place', details: { category: 'restaurante', city: 'Sao Paulo' } });
    expect(reclassified.status).toBe(201);
    expect((reclassified.body as LeisureItemBody).type).toBe('place');
    expect((reclassified.body as LeisureItemBody).place?.category).toBe('restaurante');
  });

  it('rejects creating a "place" item without the required category field', async () => {
    const { accessToken } = await createConfirmedUser();

    const response = await request(server())
      .post('/api/v1/leisure/items')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'place', title: 'Um lugar', durationType: 'unknown', place: {} });

    expect(response.status).toBe(400);
    expect((response.body as { code: string }).code).toBe('VALIDATION_ERROR');
  });

  it('plan entry lifecycle: create -> list by date range -> reschedule -> complete -> delete', async () => {
    const { accessToken } = await createConfirmedUser();
    const auth = (req: request.Test) => req.set('Authorization', `Bearer ${accessToken}`);
    const today = new Date().toISOString().slice(0, 10);

    const created = await auth(request(server()).post('/api/v1/leisure/plan')).send({
      title: 'Assistir um filme',
      date: today,
      startTime: '20:00',
    });
    expect(created.status).toBe(201);
    const entry = created.body as PlanEntryBody;

    const listed = await auth(
      request(server()).get(`/api/v1/leisure/plan?startDate=${today}&endDate=${today}`),
    );
    expect(listed.status).toBe(200);
    expect((listed.body as PlanEntryBody[]).some((e) => e.id === entry.id)).toBe(true);

    const rescheduled = await auth(
      request(server()).patch(`/api/v1/leisure/plan/${entry.id}`),
    ).send({ startTime: '21:00' });
    expect(rescheduled.status).toBe(200);

    const completed = await auth(
      request(server()).post(`/api/v1/leisure/plan/${entry.id}/complete`),
    );
    expect(completed.status).toBe(201);
    expect((completed.body as PlanEntryBody).completed).toBe(true);

    const deleted = await auth(request(server()).delete(`/api/v1/leisure/plan/${entry.id}`));
    expect(deleted.status).toBe(204);
  });

  it('history: logs an occurrence and lists it back, most recent first', async () => {
    const { accessToken } = await createConfirmedUser();
    const auth = (req: request.Test) => req.set('Authorization', `Bearer ${accessToken}`);

    const logged = await auth(request(server()).post('/api/v1/leisure/history')).send({
      activityType: 'movie',
      title: 'Interestelar',
      completedAt: new Date().toISOString(),
      rating: 5,
    });
    expect(logged.status).toBe(201);

    const history = await auth(request(server()).get('/api/v1/leisure/history'));
    expect(history.status).toBe(200);
    expect((history.body as LogEntryBody[])[0]?.title).toBe('Interestelar');
  });

  it('notes: create -> pin -> toggle checklist item -> delete', async () => {
    const { accessToken } = await createConfirmedUser();
    const auth = (req: request.Test) => req.set('Authorization', `Bearer ${accessToken}`);

    const created = await auth(request(server()).post('/api/v1/leisure/notes')).send({
      type: 'checklist',
      content: '',
      title: 'Levar para a praia',
      checklistItems: [{ id: 'c1', text: 'Protetor solar', checked: false }],
    });
    expect(created.status).toBe(201);
    const note = created.body as NoteBody;

    const pinned = await auth(request(server()).post(`/api/v1/leisure/notes/${note.id}/pin`));
    expect(pinned.status).toBe(201);
    expect((pinned.body as NoteBody).pinned).toBe(true);

    const toggled = await auth(
      request(server()).patch(`/api/v1/leisure/notes/${note.id}/checklist/c1`),
    );
    expect(toggled.status).toBe(200);
    expect((toggled.body as NoteBody).checklistItems?.[0]?.checked).toBe(true);

    const deleted = await auth(request(server()).delete(`/api/v1/leisure/notes/${note.id}`));
    expect(deleted.status).toBe(204);
  });

  it('collections: create with initial items -> add -> remove', async () => {
    const { accessToken } = await createConfirmedUser();
    const auth = (req: request.Test) => req.set('Authorization', `Bearer ${accessToken}`);

    const item1 = await auth(request(server()).post('/api/v1/leisure/items')).send({
      type: 'custom',
      title: 'Item 1',
      durationType: 'unknown',
      custom: {},
    });
    const item2 = await auth(request(server()).post('/api/v1/leisure/items')).send({
      type: 'custom',
      title: 'Item 2',
      durationType: 'unknown',
      custom: {},
    });
    const item1Id = (item1.body as LeisureItemBody).id;
    const item2Id = (item2.body as LeisureItemBody).id;

    const created = await auth(request(server()).post('/api/v1/leisure/collections')).send({
      name: 'Filmes para domingo',
      itemIds: [item1Id],
    });
    expect(created.status).toBe(201);
    const collection = created.body as CollectionBody;
    expect(collection.itemIds).toEqual([item1Id]);

    const added = await auth(
      request(server()).post(`/api/v1/leisure/collections/${collection.id}/items`),
    ).send({ itemId: item2Id });
    expect(added.status).toBe(201);
    expect((added.body as CollectionBody).itemIds.sort()).toEqual([item1Id, item2Id].sort());

    const removed = await auth(
      request(server()).delete(`/api/v1/leisure/collections/${collection.id}/items/${item1Id}`),
    );
    expect(removed.status).toBe(200);
    expect((removed.body as CollectionBody).itemIds).toEqual([item2Id]);
  });

  it("summary: reflects an in-progress item, a backlog (unsorted) count, and today's next plan entry", async () => {
    const { accessToken } = await createConfirmedUser();
    const auth = (req: request.Test) => req.set('Authorization', `Bearer ${accessToken}`);
    const today = new Date().toISOString().slice(0, 10);

    await auth(request(server()).post('/api/v1/leisure/items')).send({
      type: 'game',
      title: 'Jogando agora',
      status: 'inProgress',
      durationType: 'unknown',
      game: {},
    });
    await auth(request(server()).post('/api/v1/leisure/items')).send({
      type: 'unsorted',
      title: 'Nao sei o que e',
      durationType: 'unknown',
      unsorted: {},
    });
    await auth(request(server()).post('/api/v1/leisure/plan')).send({
      title: 'Plano de hoje',
      date: today,
    });

    const summary = await auth(request(server()).get(`/api/v1/leisure/summary?date=${today}`));
    expect(summary.status).toBe(200);
    const body = summary.body as SummaryBody;
    expect(body.inProgress?.title).toBe('Jogando agora');
    expect(body.plannedToday?.title).toBe('Plano de hoje');
    expect(body.backlogCount).toBeGreaterThanOrEqual(1);
  });

  it('never lets User A see or mutate User B leisure data', async () => {
    const userA = await createConfirmedUser();
    const userB = await createConfirmedUser();

    const created = await request(server())
      .post('/api/v1/leisure/items')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ type: 'custom', title: 'Segredo do A', durationType: 'unknown', custom: {} });
    const itemId = (created.body as LeisureItemBody).id;

    const readAttempt = await request(server())
      .get(`/api/v1/leisure/items/${itemId}`)
      .set('Authorization', `Bearer ${userB.accessToken}`);
    expect(readAttempt.status).toBe(404);

    const updateAttempt = await request(server())
      .patch(`/api/v1/leisure/items/${itemId}`)
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({ title: 'hijacked' });
    expect(updateAttempt.status).toBe(404);

    const listA = await request(server())
      .get('/api/v1/leisure/items')
      .set('Authorization', `Bearer ${userA.accessToken}`);
    const listB = await request(server())
      .get('/api/v1/leisure/items')
      .set('Authorization', `Bearer ${userB.accessToken}`);
    expect((listA.body as LeisureItemBody[]).some((entry) => entry.id === itemId)).toBe(true);
    expect((listB.body as LeisureItemBody[]).some((entry) => entry.id === itemId)).toBe(false);
  });
});
