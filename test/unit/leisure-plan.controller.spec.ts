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
    archived: false,
    archivedAt: null,
    ...overrides,
  };
}

function buildService(overrides: Partial<Record<keyof LeisurePlanService, unknown>> = {}) {
  return {
    findByDateRange: vi.fn().mockResolvedValue([buildEntry()]),
    findById: vi.fn().mockResolvedValue(buildEntry()),
    create: vi.fn().mockResolvedValue(buildEntry()),
    update: vi.fn().mockResolvedValue(buildEntry()),
    archive: vi
      .fn()
      .mockResolvedValue(buildEntry({ archived: true, archivedAt: '2026-01-02T00:00:00.000Z' })),
    unarchive: vi.fn().mockResolvedValue(buildEntry({ archived: false, archivedAt: null })),
    findArchived: vi.fn().mockResolvedValue([buildEntry({ archived: true })]),
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
    const body = {
      title: 'Watch a movie',
      date: '2026-01-01',
      startTime: '19:00',
      endTime: '21:00',
      duration: 120,
    };

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

  it('POST /:id/archive delegates to LeisurePlanService.archive', async () => {
    const service = buildService();
    const controller = new LeisurePlanController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.archive(user, { id: 'plan-1' });

    expect(service.archive).toHaveBeenCalledWith(user, 'plan-1');
    expect(result.archived).toBe(true);
  });

  it('POST /:id/unarchive delegates to LeisurePlanService.unarchive', async () => {
    const service = buildService();
    const controller = new LeisurePlanController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.unarchive(user, { id: 'plan-1' });

    expect(service.unarchive).toHaveBeenCalledWith(user, 'plan-1');
    expect(result.archived).toBe(false);
  });

  it('GET /archived delegates to LeisurePlanService.findArchived', async () => {
    const service = buildService();
    const controller = new LeisurePlanController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.findArchived(user);

    expect(service.findArchived).toHaveBeenCalledWith(user);
    expect(result).toEqual([buildEntry({ archived: true })]);
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
