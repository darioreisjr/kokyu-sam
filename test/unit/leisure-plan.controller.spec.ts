import { describe, expect, it, vi } from 'vitest';
import { LeisurePlanController } from '../../src/modules/leisure/leisure-plan.controller';
import { LeisurePlanService } from '../../src/modules/leisure/leisure-plan.service';
import { LeisurePlanEntry } from '../../src/modules/leisure/types/leisure-plan-entry.type';
import { buildAuthenticatedUser } from '../factories/authenticated-user.factory';

function buildEntry(overrides: Partial<LeisurePlanEntry> = {}): LeisurePlanEntry {
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

function buildService(overrides: Partial<Record<keyof LeisurePlanService, unknown>> = {}) {
  return {
    findByDateRange: vi.fn().mockResolvedValue([buildEntry()]),
    findById: vi.fn().mockResolvedValue(buildEntry()),
    create: vi.fn().mockResolvedValue(buildEntry()),
    update: vi.fn().mockResolvedValue(buildEntry()),
    delete: vi.fn().mockResolvedValue(undefined),
    complete: vi.fn().mockResolvedValue(buildEntry({ completed: true })),
    ...overrides,
  } as unknown as LeisurePlanService;
}

describe('LeisurePlanController', () => {
  it('GET / delegates to LeisurePlanService.findByDateRange', async () => {
    const service = buildService();
    const controller = new LeisurePlanController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.findByDateRange(user, {
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });

    expect(service.findByDateRange).toHaveBeenCalledWith(user, '2026-01-01', '2026-01-31');
    expect(result).toEqual([buildEntry()]);
  });

  it('POST / delegates to LeisurePlanService.create', async () => {
    const service = buildService();
    const controller = new LeisurePlanController(service);
    const user = buildAuthenticatedUser();
    const body = { title: 'Watch a movie', date: '2026-01-01' };

    await controller.create(user, body);

    expect(service.create).toHaveBeenCalledWith(user, body);
  });

  it('GET /:id delegates to LeisurePlanService.findById', async () => {
    const service = buildService();
    const controller = new LeisurePlanController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.findById(user, { id: 'plan-1' });

    expect(service.findById).toHaveBeenCalledWith(user, 'plan-1');
    expect(result).toEqual(buildEntry());
  });

  it('PATCH /:id delegates to LeisurePlanService.update', async () => {
    const service = buildService();
    const controller = new LeisurePlanController(service);
    const user = buildAuthenticatedUser();
    const body = { title: 'Renamed' };

    await controller.update(user, { id: 'plan-1' }, body);

    expect(service.update).toHaveBeenCalledWith(user, 'plan-1', body);
  });

  it('DELETE /:id delegates to LeisurePlanService.delete', async () => {
    const service = buildService();
    const controller = new LeisurePlanController(service);
    const user = buildAuthenticatedUser();

    await controller.delete(user, { id: 'plan-1' });

    expect(service.delete).toHaveBeenCalledWith(user, 'plan-1');
  });

  it('POST /:id/complete delegates to LeisurePlanService.complete', async () => {
    const service = buildService();
    const controller = new LeisurePlanController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.complete(user, { id: 'plan-1' }, {});

    expect(service.complete).toHaveBeenCalledWith(user, 'plan-1', undefined);
    expect(result.completed).toBe(true);
  });

  it('POST /:id/complete forwards the occurrence date for a recurring entry', async () => {
    const service = buildService();
    const controller = new LeisurePlanController(service);
    const user = buildAuthenticatedUser();

    await controller.complete(user, { id: 'plan-1' }, { date: '2026-03-05' });

    expect(service.complete).toHaveBeenCalledWith(user, 'plan-1', '2026-03-05');
  });
});
