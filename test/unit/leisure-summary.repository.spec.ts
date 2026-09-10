import { describe, expect, it, vi } from 'vitest';
import { SupabaseLeisureSummaryRepository } from '../../src/modules/leisure/leisure-summary.repository';

type SupabaseArg = ConstructorParameters<typeof SupabaseLeisureSummaryRepository>[0];

function buildRepository(client: unknown): SupabaseLeisureSummaryRepository {
  const supabase = { getUserScopedClient: () => client } as unknown as SupabaseArg;
  return new SupabaseLeisureSummaryRepository(supabase);
}

/**
 * Builds a client whose `from('leisure_items')` dispatches per call: the
 * first call is the "in progress" query, the second the backlog
 * head-count query (two total calls driven by Promise.all).
 * `plannedToday` is no longer computed here - see
 * `LeisureSummaryService`, which derives it from
 * `LeisurePlanService.findByDateRange` instead.
 */
function buildClient(options: {
  inProgress?: { data: unknown; error: unknown };
  backlog?: { count: number | null; error: unknown };
}) {
  const inProgress = options.inProgress ?? { data: null, error: null };
  const backlog = options.backlog ?? { count: 0, error: null };

  const inProgressMaybeSingle = vi.fn(() => Promise.resolve(inProgress));
  const inProgressLimit = vi.fn(() => ({ maybeSingle: inProgressMaybeSingle }));
  const inProgressOrder = vi.fn(() => ({ limit: inProgressLimit }));
  const inProgressEq = vi.fn(() => ({ order: inProgressOrder }));

  const backlogEq = vi.fn(() => Promise.resolve(backlog));

  let itemsCallCount = 0;
  const from = vi.fn(() => {
    itemsCallCount += 1;
    if (itemsCallCount === 1) {
      return { select: vi.fn(() => ({ eq: inProgressEq })) };
    }
    return { select: vi.fn(() => ({ eq: backlogEq })) };
  });

  return { from, inProgressEq, backlogEq };
}

describe('SupabaseLeisureSummaryRepository.getSummary', () => {
  it('runs both queries and assembles the base summary when everything is present', async () => {
    const { from } = buildClient({
      inProgress: {
        data: { id: 'item-2', title: 'The Odyssey', type: 'book' },
        error: null,
      },
      backlog: { count: 4, error: null },
    });
    const repository = buildRepository({ from });

    const summary = await repository.getSummary('token');

    expect(from).toHaveBeenCalledWith('leisure_items');
    expect(summary).toEqual({
      inProgress: { id: 'item-2', title: 'The Odyssey', type: 'book' },
      backlogCount: 4,
    });
  });

  it('returns null inProgress and zero backlogCount when nothing is found', async () => {
    const { from } = buildClient({ backlog: { count: null, error: null } });
    const repository = buildRepository({ from });

    await expect(repository.getSummary('token')).resolves.toEqual({
      inProgress: null,
      backlogCount: 0,
    });
  });

  it('throws a mapped error when the in-progress query fails', async () => {
    const { from } = buildClient({
      inProgress: { data: null, error: { code: 'XX000', message: 'boom' } },
    });
    const repository = buildRepository({ from });

    await expect(repository.getSummary('token')).rejects.toBeInstanceOf(Error);
  });

  it('throws a mapped error when the backlog head-count query fails', async () => {
    const { from } = buildClient({
      backlog: { count: null, error: { code: 'XX000', message: 'boom' } },
    });
    const repository = buildRepository({ from });

    await expect(repository.getSummary('token')).rejects.toBeInstanceOf(Error);
  });
});

describe('SupabaseLeisureSummaryRepository.getItemType', () => {
  it("returns the item's type", async () => {
    const maybeSingle = vi.fn(() => Promise.resolve({ data: { type: 'movie' }, error: null }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const repository = buildRepository({ from });

    const type = await repository.getItemType('token', 'item-1');

    expect(from).toHaveBeenCalledWith('leisure_items');
    expect(eq).toHaveBeenCalledWith('id', 'item-1');
    expect(type).toBe('movie');
  });

  it('returns null when the item does not exist', async () => {
    const maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ select }) });

    await expect(repository.getItemType('token', 'missing')).resolves.toBeNull();
  });

  it('throws a mapped error when the query fails', async () => {
    const maybeSingle = vi.fn(() =>
      Promise.resolve({ data: null, error: { code: 'XX000', message: 'boom' } }),
    );
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ select }) });

    await expect(repository.getItemType('token', 'item-1')).rejects.toBeInstanceOf(Error);
  });
});
