import { describe, expect, it, vi } from 'vitest';
import { SupabaseLeisureSummaryRepository } from '../../src/modules/leisure/leisure-summary.repository';

type SupabaseArg = ConstructorParameters<typeof SupabaseLeisureSummaryRepository>[0];

function buildRepository(client: unknown): SupabaseLeisureSummaryRepository {
  const supabase = { getUserScopedClient: () => client } as unknown as SupabaseArg;
  return new SupabaseLeisureSummaryRepository(supabase);
}

/**
 * Builds a client whose `from()` dispatches per table: `leisure_plan_entries`
 * for the "next planned entry today" query and `leisure_items` for both the
 * "in progress" query and the backlog head-count query (three total calls
 * driven by Promise.all).
 */
function buildClient(options: {
  planned?: { data: unknown; error: unknown };
  inProgress?: { data: unknown; error: unknown };
  backlog?: { count: number | null; error: unknown };
}) {
  const planned = options.planned ?? { data: null, error: null };
  const inProgress = options.inProgress ?? { data: null, error: null };
  const backlog = options.backlog ?? { count: 0, error: null };

  const plannedMaybeSingle = vi.fn(() => Promise.resolve(planned));
  const plannedLimit = vi.fn(() => ({ maybeSingle: plannedMaybeSingle }));
  const plannedOrder = vi.fn(() => ({ limit: plannedLimit }));
  const plannedEqCompleted = vi.fn(() => ({ order: plannedOrder }));
  const plannedEqDate = vi.fn(() => ({ eq: plannedEqCompleted }));
  const plannedSelect = vi.fn(() => ({ eq: plannedEqDate }));

  const inProgressMaybeSingle = vi.fn(() => Promise.resolve(inProgress));
  const inProgressLimit = vi.fn(() => ({ maybeSingle: inProgressMaybeSingle }));
  const inProgressOrder = vi.fn(() => ({ limit: inProgressLimit }));
  const inProgressEq = vi.fn(() => ({ order: inProgressOrder }));

  const backlogEq = vi.fn(() => Promise.resolve(backlog));

  let itemsCallCount = 0;
  const from = vi.fn((table: string) => {
    if (table === 'leisure_plan_entries') {
      return { select: plannedSelect };
    }
    itemsCallCount += 1;
    if (itemsCallCount === 1) {
      return { select: vi.fn(() => ({ eq: inProgressEq })) };
    }
    return { select: vi.fn(() => ({ eq: backlogEq })) };
  });

  return { from, plannedEqDate, plannedEqCompleted, inProgressEq, backlogEq };
}

describe('SupabaseLeisureSummaryRepository.getSummary', () => {
  it('runs all three queries and assembles the summary when everything is present', async () => {
    const { from, plannedEqDate } = buildClient({
      planned: {
        data: {
          id: 'plan-1',
          title: 'Watch a movie',
          start_time: '19:00',
          leisure_item_id: 'item-1',
          leisure_items: { type: 'movie' },
        },
        error: null,
      },
      inProgress: {
        data: { id: 'item-2', title: 'The Odyssey', type: 'book' },
        error: null,
      },
      backlog: { count: 4, error: null },
    });
    const repository = buildRepository({ from });

    const summary = await repository.getSummary('token', '2026-01-01');

    expect(plannedEqDate).toHaveBeenCalledWith('date', '2026-01-01');
    expect(summary).toEqual({
      plannedToday: { id: 'plan-1', title: 'Watch a movie', type: 'movie', startTime: '19:00' },
      inProgress: { id: 'item-2', title: 'The Odyssey', type: 'book' },
      backlogCount: 4,
    });
  });

  it('falls back to "custom" type when the planned entry has no linked leisure item', async () => {
    const { from } = buildClient({
      planned: {
        data: {
          id: 'plan-1',
          title: 'Custom activity',
          start_time: null,
          leisure_item_id: null,
          leisure_items: null,
        },
        error: null,
      },
    });
    const repository = buildRepository({ from });

    const summary = await repository.getSummary('token', '2026-01-01');

    expect(summary.plannedToday).toEqual({
      id: 'plan-1',
      title: 'Custom activity',
      type: 'custom',
      startTime: null,
    });
  });

  it('returns null plannedToday/inProgress and zero backlogCount when nothing is found', async () => {
    const { from } = buildClient({ backlog: { count: null, error: null } });
    const repository = buildRepository({ from });

    await expect(repository.getSummary('token', '2026-01-01')).resolves.toEqual({
      plannedToday: null,
      inProgress: null,
      backlogCount: 0,
    });
  });

  it('throws a mapped error when the planned-entry query fails', async () => {
    const { from } = buildClient({
      planned: { data: null, error: { code: 'XX000', message: 'boom' } },
    });
    const repository = buildRepository({ from });

    await expect(repository.getSummary('token', '2026-01-01')).rejects.toBeInstanceOf(Error);
  });

  it('throws a mapped error when the in-progress query fails', async () => {
    const { from } = buildClient({
      inProgress: { data: null, error: { code: 'XX000', message: 'boom' } },
    });
    const repository = buildRepository({ from });

    await expect(repository.getSummary('token', '2026-01-01')).rejects.toBeInstanceOf(Error);
  });

  it('throws a mapped error when the backlog head-count query fails', async () => {
    const { from } = buildClient({
      backlog: { count: null, error: { code: 'XX000', message: 'boom' } },
    });
    const repository = buildRepository({ from });

    await expect(repository.getSummary('token', '2026-01-01')).rejects.toBeInstanceOf(Error);
  });
});
