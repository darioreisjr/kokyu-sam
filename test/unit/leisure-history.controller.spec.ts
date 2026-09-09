import { describe, expect, it, vi } from 'vitest';
import { LeisureHistoryController } from '../../src/modules/leisure/leisure-history.controller';
import { LeisureHistoryService } from '../../src/modules/leisure/leisure-history.service';
import { LeisureLogEntry } from '../../src/modules/leisure/types/leisure-log-entry.type';
import { buildAuthenticatedUser } from '../factories/authenticated-user.factory';

function buildLogEntry(overrides: Partial<LeisureLogEntry> = {}): LeisureLogEntry {
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

function buildService(overrides: Partial<Record<keyof LeisureHistoryService, unknown>> = {}) {
  return {
    findAll: vi.fn().mockResolvedValue([buildLogEntry()]),
    create: vi.fn().mockResolvedValue(buildLogEntry()),
    ...overrides,
  } as unknown as LeisureHistoryService;
}

describe('LeisureHistoryController', () => {
  it('GET / delegates to LeisureHistoryService.findAll', async () => {
    const service = buildService();
    const controller = new LeisureHistoryController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.findAll(user, { limit: 20 });

    expect(service.findAll).toHaveBeenCalledWith(user, { limit: 20 });
    expect(result).toEqual([buildLogEntry()]);
  });

  it('POST / delegates to LeisureHistoryService.create', async () => {
    const service = buildService();
    const controller = new LeisureHistoryController(service);
    const user = buildAuthenticatedUser();
    const body = {
      activityType: 'movie' as const,
      title: 'Dune',
      completedAt: '2026-01-01T20:00:00.000Z',
    };

    await controller.create(user, body);

    expect(service.create).toHaveBeenCalledWith(user, body);
  });
});
