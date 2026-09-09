import { describe, expect, it, vi } from 'vitest';
import { LeisurePlanEntryNotFoundError } from '../../src/common/errors/app.error';
import { LeisurePlanService } from '../../src/modules/leisure/leisure-plan.service';
import { LeisurePlanRepository } from '../../src/modules/leisure/types/leisure-plan-repository.interface';
import { LeisurePlanEntry } from '../../src/modules/leisure/types/leisure-plan-entry.type';
import { buildAuthenticatedUser } from '../factories/authenticated-user.factory';

function buildEntry(overrides: Partial<LeisurePlanEntry> = {}): LeisurePlanEntry {
  return {
    id: 'plan-1',
    userId: 'user-1',
    leisureItemId: null,
    title: 'Watch a movie',
    date: '2026-01-01',
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

function buildRepository(overrides: Partial<LeisurePlanRepository> = {}): LeisurePlanRepository {
  return {
    findByDateRange: vi.fn().mockResolvedValue([buildEntry()]),
    create: vi.fn().mockResolvedValue(buildEntry()),
    update: vi.fn().mockResolvedValue(buildEntry()),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('LeisurePlanService.findByDateRange', () => {
  it('delegates to the repository', async () => {
    const repository = buildRepository();
    const service = new LeisurePlanService(repository);
    const user = buildAuthenticatedUser();

    await service.findByDateRange(user, '2026-01-01', '2026-01-31');

    expect(repository.findByDateRange).toHaveBeenCalledWith(
      user.accessToken,
      '2026-01-01',
      '2026-01-31',
    );
  });
});

describe('LeisurePlanService.create', () => {
  it('delegates to the repository with the caller id and access token', async () => {
    const repository = buildRepository();
    const service = new LeisurePlanService(repository);
    const user = buildAuthenticatedUser({ id: 'user-1' });
    const input = { title: 'Watch a movie', date: '2026-01-01' };

    await service.create(user, input);

    expect(repository.create).toHaveBeenCalledWith(user.accessToken, 'user-1', input);
  });
});

describe('LeisurePlanService.update', () => {
  it('returns the updated entry', async () => {
    const repository = buildRepository({
      update: vi.fn().mockResolvedValue(buildEntry({ title: 'Renamed' })),
    });
    const service = new LeisurePlanService(repository);

    const result = await service.update(buildAuthenticatedUser(), 'plan-1', { title: 'Renamed' });

    expect(result.title).toBe('Renamed');
  });

  it('throws LeisurePlanEntryNotFoundError when the repository returns null', async () => {
    const repository = buildRepository({ update: vi.fn().mockResolvedValue(null) });
    const service = new LeisurePlanService(repository);

    await expect(
      service.update(buildAuthenticatedUser(), 'missing', { title: 'x' }),
    ).rejects.toBeInstanceOf(LeisurePlanEntryNotFoundError);
  });
});

describe('LeisurePlanService.delete', () => {
  it('delegates to the repository', async () => {
    const repository = buildRepository();
    const service = new LeisurePlanService(repository);
    const user = buildAuthenticatedUser();

    await service.delete(user, 'plan-1');

    expect(repository.delete).toHaveBeenCalledWith(user.accessToken, 'plan-1');
  });
});

describe('LeisurePlanService.complete', () => {
  it('patches completed to true', async () => {
    const repository = buildRepository();
    const service = new LeisurePlanService(repository);
    const user = buildAuthenticatedUser();

    await service.complete(user, 'plan-1');

    expect(repository.update).toHaveBeenCalledWith(user.accessToken, 'plan-1', {
      completed: true,
    });
  });

  it('throws LeisurePlanEntryNotFoundError when the entry does not exist', async () => {
    const repository = buildRepository({ update: vi.fn().mockResolvedValue(null) });
    const service = new LeisurePlanService(repository);

    await expect(service.complete(buildAuthenticatedUser(), 'missing')).rejects.toBeInstanceOf(
      LeisurePlanEntryNotFoundError,
    );
  });
});
