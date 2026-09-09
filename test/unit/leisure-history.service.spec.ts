import { describe, expect, it, vi } from 'vitest';
import { LeisureHistoryService } from '../../src/modules/leisure/leisure-history.service';
import { LeisureHistoryRepository } from '../../src/modules/leisure/types/leisure-history-repository.interface';
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

function buildRepository(
  overrides: Partial<LeisureHistoryRepository> = {},
): LeisureHistoryRepository {
  return {
    findAll: vi.fn().mockResolvedValue([buildLogEntry()]),
    create: vi.fn().mockResolvedValue(buildLogEntry()),
    ...overrides,
  };
}

describe('LeisureHistoryService.findAll', () => {
  it('delegates to the repository', async () => {
    const repository = buildRepository();
    const service = new LeisureHistoryService(repository);
    const user = buildAuthenticatedUser();

    await service.findAll(user, { limit: 20 });

    expect(repository.findAll).toHaveBeenCalledWith(user.accessToken, { limit: 20 });
  });
});

describe('LeisureHistoryService.create', () => {
  it('delegates to the repository with the caller id and access token', async () => {
    const repository = buildRepository();
    const service = new LeisureHistoryService(repository);
    const user = buildAuthenticatedUser({ id: 'user-1' });
    const input = {
      activityType: 'movie' as const,
      title: 'Dune',
      completedAt: '2026-01-01T20:00:00.000Z',
    };

    await service.create(user, input);

    expect(repository.create).toHaveBeenCalledWith(user.accessToken, 'user-1', input);
  });
});
