import { describe, expect, it, vi } from 'vitest';
import { LeisureSummaryService } from '../../src/modules/leisure/leisure-summary.service';
import { LeisureSummaryRepository } from '../../src/modules/leisure/types/leisure-summary-repository.interface';
import { LeisureSummary } from '../../src/modules/leisure/types/leisure-summary.type';
import { buildAuthenticatedUser } from '../factories/authenticated-user.factory';

function buildSummary(overrides: Partial<LeisureSummary> = {}): LeisureSummary {
  return {
    plannedToday: null,
    inProgress: null,
    backlogCount: 0,
    ...overrides,
  };
}

describe('LeisureSummaryService.getSummary', () => {
  it('delegates to the repository with the caller access token and date', async () => {
    const repository: LeisureSummaryRepository = {
      getSummary: vi.fn().mockResolvedValue(buildSummary({ backlogCount: 3 })),
    };
    const service = new LeisureSummaryService(repository);
    const user = buildAuthenticatedUser();

    const result = await service.getSummary(user, '2026-01-01');

    expect(repository.getSummary).toHaveBeenCalledWith(user.accessToken, '2026-01-01');
    expect(result).toEqual(buildSummary({ backlogCount: 3 }));
  });
});
