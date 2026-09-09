import { describe, expect, it, vi } from 'vitest';
import { LeisureSummaryController } from '../../src/modules/leisure/leisure-summary.controller';
import { LeisureSummaryService } from '../../src/modules/leisure/leisure-summary.service';
import { LeisureSummary } from '../../src/modules/leisure/types/leisure-summary.type';
import { buildAuthenticatedUser } from '../factories/authenticated-user.factory';

describe('LeisureSummaryController', () => {
  it('GET / delegates to LeisureSummaryService.getSummary with the query date', async () => {
    const expected: LeisureSummary = { plannedToday: null, inProgress: null, backlogCount: 2 };
    const service = {
      getSummary: vi.fn().mockResolvedValue(expected),
    } as unknown as LeisureSummaryService;
    const controller = new LeisureSummaryController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.getSummary(user, { date: '2026-01-01' });

    expect(service.getSummary).toHaveBeenCalledWith(user, '2026-01-01');
    expect(result).toBe(expected);
  });
});
