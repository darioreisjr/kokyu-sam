import { describe, expect, it, vi } from 'vitest';
import { SupabaseLeisureHistoryRepository } from '../../src/modules/leisure/leisure-history.repository';
import { LeisureLogEntry } from '../../src/modules/leisure/types/leisure-log-entry.type';

function buildLogRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'log-1',
    user_id: 'user-1',
    leisure_item_id: 'item-1',
    activity_type: 'movie',
    title: 'Dune',
    started_at: null,
    completed_at: '2026-01-01T20:00:00.000Z',
    duration: 155,
    rating: 5,
    notes: null,
    created_at: '2026-01-01T20:05:00.000Z',
    ...overrides,
  };
}

function buildExpectedEntry(overrides: Partial<LeisureLogEntry> = {}): LeisureLogEntry {
  return {
    id: 'log-1',
    userId: 'user-1',
    leisureItemId: 'item-1',
    activityType: 'movie',
    title: 'Dune',
    startedAt: null,
    completedAt: '2026-01-01T20:00:00.000Z',
    duration: 155,
    rating: 5,
    notes: null,
    createdAt: '2026-01-01T20:05:00.000Z',
    ...overrides,
  };
}

type SupabaseArg = ConstructorParameters<typeof SupabaseLeisureHistoryRepository>[0];

function buildRepository(client: unknown): SupabaseLeisureHistoryRepository {
  const supabase = { getUserScopedClient: () => client } as unknown as SupabaseArg;
  return new SupabaseLeisureHistoryRepository(supabase);
}

describe('SupabaseLeisureHistoryRepository.findAll', () => {
  it('defaults the limit to 100 and does not filter by item when none is given', async () => {
    const limit = vi.fn(() => Promise.resolve({ data: [buildLogRow()], error: null }));
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));
    const repository = buildRepository({ from });

    const entries = await repository.findAll('token', {});

    expect(limit).toHaveBeenCalledWith(100);
    expect(entries).toEqual([buildExpectedEntry()]);
  });

  it('applies a custom limit and the leisureItemId filter when given', async () => {
    const eq = vi.fn(() => Promise.resolve({ data: [], error: null }));
    const limit = vi.fn(() => ({ eq }));
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    const repository = buildRepository({ from: () => ({ select }) });

    await repository.findAll('token', { leisureItemId: 'item-1', limit: 20 });

    expect(limit).toHaveBeenCalledWith(20);
    expect(eq).toHaveBeenCalledWith('leisure_item_id', 'item-1');
  });

  it('returns an empty array when data is null', async () => {
    const limit = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    const repository = buildRepository({ from: () => ({ select }) });

    await expect(repository.findAll('token', {})).resolves.toEqual([]);
  });

  it('throws a mapped error when the query fails', async () => {
    const limit = vi.fn(() =>
      Promise.resolve({ data: null, error: { code: 'XX000', message: 'boom' } }),
    );
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    const repository = buildRepository({ from: () => ({ select }) });

    await expect(repository.findAll('token', {})).rejects.toBeInstanceOf(Error);
  });
});

describe('SupabaseLeisureHistoryRepository.create', () => {
  it('inserts and maps the returned row', async () => {
    const single = vi.fn(() => Promise.resolve({ data: buildLogRow(), error: null }));
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const repository = buildRepository({ from: () => ({ insert }) });

    const entry = await repository.create('token', 'user-1', {
      activityType: 'movie',
      title: 'Dune',
      completedAt: '2026-01-01T20:00:00.000Z',
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        activity_type: 'movie',
        title: 'Dune',
        completed_at: '2026-01-01T20:00:00.000Z',
      }),
    );
    expect(entry).toEqual(buildExpectedEntry());
  });

  it('throws a mapped error when the insert fails', async () => {
    const single = vi.fn(() =>
      Promise.resolve({ data: null, error: { code: 'XX000', message: 'boom' } }),
    );
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const repository = buildRepository({ from: () => ({ insert }) });

    await expect(
      repository.create('token', 'user-1', {
        activityType: 'movie',
        title: 'Dune',
        completedAt: '2026-01-01T20:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(Error);
  });
});
