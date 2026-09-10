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
    occurrenceDate: '2026-01-01',
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
  it('queries candidates up to endDate, recurring or anchored on/after startDate, ordered ascending', async () => {
    const order = vi.fn(() => Promise.resolve({ data: [buildPlanRow()], error: null }));
    const or = vi.fn(() => ({ order }));
    const lte = vi.fn(() => ({ or }));
    const select = vi.fn(() => ({ lte }));
    const from = vi.fn(() => ({ select }));
    const repository = buildRepository({ from });

    const entries = await repository.findByDateRange('token', '2026-01-01', '2026-01-31');

    expect(from).toHaveBeenCalledWith('leisure_plan_entries');
    expect(lte).toHaveBeenCalledWith('date', '2026-01-31');
    expect(or).toHaveBeenCalledWith('recurrence.neq.none,date.gte.2026-01-01');
    expect(entries).toEqual([buildExpectedEntry()]);
  });

  it('returns an empty array when data is null', async () => {
    const order = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const or = vi.fn(() => ({ order }));
    const lte = vi.fn(() => ({ or }));
    const select = vi.fn(() => ({ lte }));
    const repository = buildRepository({ from: () => ({ select }) });

    await expect(repository.findByDateRange('token', '2026-01-01', '2026-01-31')).resolves.toEqual(
      [],
    );
  });

  it('throws a mapped error when the query fails', async () => {
    const order = vi.fn(() =>
      Promise.resolve({ data: null, error: { code: 'XX000', message: 'boom' } }),
    );
    const or = vi.fn(() => ({ order }));
    const lte = vi.fn(() => ({ or }));
    const select = vi.fn(() => ({ lte }));
    const repository = buildRepository({ from: () => ({ select }) });

    await expect(
      repository.findByDateRange('token', '2026-01-01', '2026-01-31'),
    ).rejects.toBeInstanceOf(Error);
  });
});

describe('SupabaseLeisurePlanRepository.findCompletedOccurrences', () => {
  it('returns a set of "planEntryId|occurrenceDate" keys within the range', async () => {
    const lte = vi.fn(() =>
      Promise.resolve({
        data: [
          { plan_entry_id: 'plan-1', occurrence_date: '2026-01-05' },
          { plan_entry_id: 'plan-1', occurrence_date: '2026-01-06' },
        ],
        error: null,
      }),
    );
    const gte = vi.fn(() => ({ lte }));
    const select = vi.fn(() => ({ gte }));
    const from = vi.fn(() => ({ select }));
    const repository = buildRepository({ from });

    const result = await repository.findCompletedOccurrences('token', '2026-01-01', '2026-01-31');

    expect(from).toHaveBeenCalledWith('leisure_plan_entry_completions');
    expect(gte).toHaveBeenCalledWith('occurrence_date', '2026-01-01');
    expect(lte).toHaveBeenCalledWith('occurrence_date', '2026-01-31');
    expect(result).toEqual(new Set(['plan-1|2026-01-05', 'plan-1|2026-01-06']));
  });

  it('returns an empty set when data is null', async () => {
    const lte = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const gte = vi.fn(() => ({ lte }));
    const select = vi.fn(() => ({ gte }));
    const repository = buildRepository({ from: () => ({ select }) });

    const result = await repository.findCompletedOccurrences('token', '2026-01-01', '2026-01-31');

    expect(result).toEqual(new Set());
  });

  it('throws a mapped error when the query fails', async () => {
    const lte = vi.fn(() =>
      Promise.resolve({ data: null, error: { code: 'XX000', message: 'boom' } }),
    );
    const gte = vi.fn(() => ({ lte }));
    const select = vi.fn(() => ({ gte }));
    const repository = buildRepository({ from: () => ({ select }) });

    await expect(
      repository.findCompletedOccurrences('token', '2026-01-01', '2026-01-31'),
    ).rejects.toBeInstanceOf(Error);
  });
});

describe('SupabaseLeisurePlanRepository.markOccurrenceCompleted', () => {
  it('upserts a completion, ignoring duplicates, and reports true on a fresh insert', async () => {
    const select = vi.fn(() =>
      Promise.resolve({ data: [{ plan_entry_id: 'plan-1' }], error: null }),
    );
    const upsert = vi.fn(() => ({ select }));
    const repository = buildRepository({ from: () => ({ upsert }) });

    const wasNewCompletion = await repository.markOccurrenceCompleted(
      'token',
      'user-1',
      'plan-1',
      '2026-01-05',
    );

    expect(upsert).toHaveBeenCalledWith(
      { user_id: 'user-1', plan_entry_id: 'plan-1', occurrence_date: '2026-01-05' },
      { onConflict: 'plan_entry_id,occurrence_date', ignoreDuplicates: true },
    );
    expect(select).toHaveBeenCalledWith('plan_entry_id');
    expect(wasNewCompletion).toBe(true);
  });

  it('reports false when the occurrence was already completed (conflict row skipped)', async () => {
    const select = vi.fn(() => Promise.resolve({ data: [], error: null }));
    const upsert = vi.fn(() => ({ select }));
    const repository = buildRepository({ from: () => ({ upsert }) });

    const wasNewCompletion = await repository.markOccurrenceCompleted(
      'token',
      'user-1',
      'plan-1',
      '2026-01-05',
    );

    expect(wasNewCompletion).toBe(false);
  });

  it('throws a mapped error when the upsert fails', async () => {
    const select = vi.fn(() =>
      Promise.resolve({ data: null, error: { code: 'XX000', message: 'boom' } }),
    );
    const upsert = vi.fn(() => ({ select }));
    const repository = buildRepository({ from: () => ({ upsert }) });

    await expect(
      repository.markOccurrenceCompleted('token', 'user-1', 'plan-1', '2026-01-05'),
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

  it('strips the seconds Postgres always adds to a `time` column', async () => {
    const maybeSingle = vi.fn(() =>
      Promise.resolve({
        data: buildPlanRow({ start_time: '19:00:00', end_time: '21:00:00' }),
        error: null,
      }),
    );
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ select }) });

    const entry = await repository.findById('token', 'plan-1');

    expect(entry).toEqual(buildExpectedEntry({ startTime: '19:00', endTime: '21:00' }));
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
