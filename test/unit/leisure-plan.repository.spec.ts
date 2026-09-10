import { describe, expect, it, vi } from 'vitest';
import { SupabaseLeisurePlanRepository } from '../../src/modules/leisure/leisure-plan.repository';
import { LeisurePlanEntry } from '../../src/modules/leisure/types/leisure-plan-entry.type';

function buildPlanRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'plan-1',
    user_id: 'user-1',
    leisure_item_id: null,
    title: 'Watch a movie',
    date: '2026-01-01',
    start_time: '19:00',
    end_time: null,
    duration: 120,
    recurrence: 'none',
    notes: null,
    reminder: false,
    completed: false,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildExpectedEntry(overrides: Partial<LeisurePlanEntry> = {}): LeisurePlanEntry {
  return {
    id: 'plan-1',
    userId: 'user-1',
    leisureItemId: null,
    title: 'Watch a movie',
    date: '2026-01-01',
    startTime: '19:00',
    endTime: null,
    duration: 120,
    recurrence: 'none',
    notes: null,
    reminder: false,
    completed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

type SupabaseArg = ConstructorParameters<typeof SupabaseLeisurePlanRepository>[0];

function buildRepository(client: unknown): SupabaseLeisurePlanRepository {
  const supabase = { getUserScopedClient: () => client } as unknown as SupabaseArg;
  return new SupabaseLeisurePlanRepository(supabase);
}

describe('SupabaseLeisurePlanRepository.findByDateRange', () => {
  it('queries within an inclusive date range ordered ascending', async () => {
    const order = vi.fn(() => Promise.resolve({ data: [buildPlanRow()], error: null }));
    const lte = vi.fn(() => ({ order }));
    const gte = vi.fn(() => ({ lte }));
    const select = vi.fn(() => ({ gte }));
    const from = vi.fn(() => ({ select }));
    const repository = buildRepository({ from });

    const entries = await repository.findByDateRange('token', '2026-01-01', '2026-01-31');

    expect(from).toHaveBeenCalledWith('leisure_plan_entries');
    expect(gte).toHaveBeenCalledWith('date', '2026-01-01');
    expect(lte).toHaveBeenCalledWith('date', '2026-01-31');
    expect(entries).toEqual([buildExpectedEntry()]);
  });

  it('returns an empty array when data is null', async () => {
    const order = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const lte = vi.fn(() => ({ order }));
    const gte = vi.fn(() => ({ lte }));
    const select = vi.fn(() => ({ gte }));
    const repository = buildRepository({ from: () => ({ select }) });

    await expect(repository.findByDateRange('token', '2026-01-01', '2026-01-31')).resolves.toEqual(
      [],
    );
  });

  it('throws a mapped error when the query fails', async () => {
    const order = vi.fn(() =>
      Promise.resolve({ data: null, error: { code: 'XX000', message: 'boom' } }),
    );
    const lte = vi.fn(() => ({ order }));
    const gte = vi.fn(() => ({ lte }));
    const select = vi.fn(() => ({ gte }));
    const repository = buildRepository({ from: () => ({ select }) });

    await expect(
      repository.findByDateRange('token', '2026-01-01', '2026-01-31'),
    ).rejects.toBeInstanceOf(Error);
  });
});

describe('SupabaseLeisurePlanRepository.findById', () => {
  it('returns the mapped entry when found', async () => {
    const maybeSingle = vi.fn(() => Promise.resolve({ data: buildPlanRow(), error: null }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const repository = buildRepository({ from });

    const entry = await repository.findById('token', 'plan-1');

    expect(from).toHaveBeenCalledWith('leisure_plan_entries');
    expect(eq).toHaveBeenCalledWith('id', 'plan-1');
    expect(entry).toEqual(buildExpectedEntry());
  });

  it('returns null when no row matches', async () => {
    const maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ select }) });

    await expect(repository.findById('token', 'missing')).resolves.toBeNull();
  });

  it('throws a mapped error when the query fails', async () => {
    const maybeSingle = vi.fn(() =>
      Promise.resolve({ data: null, error: { code: 'XX000', message: 'boom' } }),
    );
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ select }) });

    await expect(repository.findById('token', 'plan-1')).rejects.toBeInstanceOf(Error);
  });
});

describe('SupabaseLeisurePlanRepository.create', () => {
  it('inserts with defaults applied and maps the returned row', async () => {
    const single = vi.fn(() => Promise.resolve({ data: buildPlanRow(), error: null }));
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const repository = buildRepository({ from: () => ({ insert }) });

    const entry = await repository.create('token', 'user-1', {
      title: 'Watch a movie',
      date: '2026-01-01',
      startTime: '19:00',
      duration: 120,
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        title: 'Watch a movie',
        recurrence: 'none',
        reminder: false,
        completed: false,
      }),
    );
    expect(entry).toEqual(buildExpectedEntry());
  });
});

describe('SupabaseLeisurePlanRepository.update', () => {
  it('only sets fields present in the patch', async () => {
    const maybeSingle = vi.fn(() =>
      Promise.resolve({ data: buildPlanRow({ completed: true }), error: null }),
    );
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ update }) });

    const entry = await repository.update('token', 'plan-1', { completed: true });

    expect(update).toHaveBeenCalledWith({ completed: true });
    expect(entry?.completed).toBe(true);
  });

  it('returns null when no row matched', async () => {
    const maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ update }) });

    await expect(repository.update('token', 'missing', { completed: true })).resolves.toBeNull();
  });
});

describe('SupabaseLeisurePlanRepository.delete', () => {
  it('deletes by id', async () => {
    const eq = vi.fn(() => Promise.resolve({ error: null }));
    const del = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ delete: del }) });

    await repository.delete('token', 'plan-1');

    expect(eq).toHaveBeenCalledWith('id', 'plan-1');
  });

  it('throws a mapped error when delete fails', async () => {
    const eq = vi.fn(() => Promise.resolve({ error: { code: 'XX000', message: 'boom' } }));
    const del = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ delete: del }) });

    await expect(repository.delete('token', 'plan-1')).rejects.toBeInstanceOf(Error);
  });
});
