import { describe, expect, it, vi } from 'vitest';
import { LeisurePlanService } from '../../src/modules/leisure/leisure-plan.service';
import { LeisureSummaryService } from '../../src/modules/leisure/leisure-summary.service';
import { LeisureSummaryRepository } from '../../src/modules/leisure/types/leisure-summary-repository.interface';
import { LeisureSummaryBase } from '../../src/modules/leisure/types/leisure-summary.type';
import { LeisurePlanEntry } from '../../src/modules/leisure/types/leisure-plan-entry.type';
import { buildAuthenticatedUser } from '../factories/authenticated-user.factory';

function buildBase(overrides: Partial<LeisureSummaryBase> = {}): LeisureSummaryBase {
  return { inProgress: null, backlogCount: 0, ...overrides };
}

function buildPlanEntry(overrides: Partial<LeisurePlanEntry> = {}): LeisurePlanEntry {
  return {
    id: 'plan-1',
    userId: 'user-1',
    leisureItemId: null,
    title: 'Watch a movie',
    date: '2026-01-01',
    occurrenceDate: '2026-01-01',
    startTime: null,
    endTime: null,
    duration: null,
    recurrence: 'none',
    notes: null,
    reminder: false,
    completed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildRepository(
  overrides: Partial<LeisureSummaryRepository> = {},
): LeisureSummaryRepository {
  return {
    getSummary: vi.fn().mockResolvedValue(buildBase()),
    getItemType: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function buildPlanService(entries: LeisurePlanEntry[] = []): LeisurePlanService {
  return { findByDateRange: vi.fn().mockResolvedValue(entries) } as unknown as LeisurePlanService;
}

describe('LeisureSummaryService.getSummary', () => {
  it('merges the repository base with a null plannedToday when nothing is planned', async () => {
    const repository = buildRepository({
      getSummary: vi.fn().mockResolvedValue(buildBase({ backlogCount: 3 })),
    });
    const planService = buildPlanService([]);
    const service = new LeisureSummaryService(repository, planService);
    const user = buildAuthenticatedUser();

    const result = await service.getSummary(user, '2026-01-01');

    expect(repository.getSummary).toHaveBeenCalledWith(user.accessToken);
    // `findByDateRange`, not a raw `date = today` query - see the service's
    // own doc comment for why this must be recurrence-aware.
    expect(planService.findByDateRange).toHaveBeenCalledWith(user, '2026-01-01', '2026-01-01');
    expect(result).toEqual({ inProgress: null, backlogCount: 3, plannedToday: null });
  });

  it('picks the earliest incomplete entry as plannedToday, resolving its item type', async () => {
    const entries = [
      buildPlanEntry({ id: 'plan-late', startTime: '20:00', leisureItemId: 'item-1' }),
      buildPlanEntry({ id: 'plan-early', startTime: '09:00', leisureItemId: 'item-2' }),
    ];
    const repository = buildRepository({ getItemType: vi.fn().mockResolvedValue('movie') });
    const planService = buildPlanService(entries);
    const service = new LeisureSummaryService(repository, planService);

    const result = await service.getSummary(buildAuthenticatedUser(), '2026-01-01');

    expect(repository.getItemType).toHaveBeenCalledWith(expect.any(String), 'item-2');
    expect(repository.getItemType).not.toHaveBeenCalledWith(expect.any(String), 'item-1');
    expect(result.plannedToday).toEqual({
      id: 'plan-early',
      title: 'Watch a movie',
      type: 'movie',
      startTime: '09:00',
    });
  });

  it('treats an entry with no startTime as sorting after every timed entry', async () => {
    const entries = [
      buildPlanEntry({ id: 'plan-no-time', startTime: null }),
      buildPlanEntry({ id: 'plan-timed', startTime: '18:00' }),
    ];
    const service = new LeisureSummaryService(buildRepository(), buildPlanService(entries));

    const result = await service.getSummary(buildAuthenticatedUser(), '2026-01-01');

    expect(result.plannedToday?.id).toBe('plan-timed');
  });

  it("ignores an already-completed entry (e.g. today's occurrence of a recurring series already done)", async () => {
    const entries = [buildPlanEntry({ id: 'plan-done', completed: true })];
    const service = new LeisureSummaryService(buildRepository(), buildPlanService(entries));

    const result = await service.getSummary(buildAuthenticatedUser(), '2026-01-01');

    expect(result.plannedToday).toBeNull();
  });

  it('falls back to "custom" for an ad hoc entry with no leisureItemId, without looking up a type', async () => {
    const entries = [buildPlanEntry({ leisureItemId: null })];
    const repository = buildRepository();
    const service = new LeisureSummaryService(repository, buildPlanService(entries));

    const result = await service.getSummary(buildAuthenticatedUser(), '2026-01-01');

    expect(repository.getItemType).not.toHaveBeenCalled();
    expect(result.plannedToday?.type).toBe('custom');
  });

  it('counts a daily entry anchored on an earlier date as planned today (the bug this fixes)', async () => {
    // The whole point of going through `findByDateRange`: it already
    // expands recurrence, so the service here has nothing special to do
    // for a recurring entry - it just trusts what comes back.
    const entries = [
      buildPlanEntry({ id: 'plan-daily', date: '2025-01-01', occurrenceDate: '2026-01-01' }),
    ];
    const service = new LeisureSummaryService(buildRepository(), buildPlanService(entries));

    const result = await service.getSummary(buildAuthenticatedUser(), '2026-01-01');

    expect(result.plannedToday?.id).toBe('plan-daily');
  });
});
