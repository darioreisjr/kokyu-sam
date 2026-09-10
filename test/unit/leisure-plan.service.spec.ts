import { describe, expect, it, vi } from 'vitest';
import {
  LeisurePlanEntryDateInvalidError,
  LeisurePlanEntryNotFoundError,
} from '../../src/common/errors/app.error';
import { LeisurePlanService } from '../../src/modules/leisure/leisure-plan.service';
import { LeisurePlanRepository } from '../../src/modules/leisure/types/leisure-plan-repository.interface';
import { LeisurePlanEntry } from '../../src/modules/leisure/types/leisure-plan-entry.type';
import { LeisureHistoryRepository } from '../../src/modules/leisure/types/leisure-history-repository.interface';
import { LeisureItemsRepository } from '../../src/modules/leisure/types/leisure-items-repository.interface';
import { LeisureItem } from '../../src/modules/leisure/types/leisure-item.type';
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

function buildRepository(overrides: Partial<LeisurePlanRepository> = {}): LeisurePlanRepository {
  return {
    findByDateRange: vi.fn().mockResolvedValue([buildEntry()]),
    findById: vi.fn().mockResolvedValue(buildEntry()),
    findCompletedOccurrences: vi.fn().mockResolvedValue(new Set()),
    markOccurrenceCompleted: vi.fn().mockResolvedValue(true),
    create: vi.fn().mockResolvedValue(buildEntry()),
    update: vi.fn().mockResolvedValue(buildEntry()),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function buildHistoryRepository(
  overrides: Partial<LeisureHistoryRepository> = {},
): LeisureHistoryRepository {
  return {
    findAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function buildItem(overrides: Partial<LeisureItem> = {}): LeisureItem {
  return {
    id: 'item-1',
    userId: 'user-1',
    type: 'movie',
    title: 'A movie',
    description: null,
    status: 'backlog',
    coverImage: null,
    tags: [],
    priority: null,
    estimatedDuration: null,
    durationType: 'unknown',
    minimumUsefulDuration: null,
    favorite: false,
    source: null,
    sourceUrl: null,
    recommendedBy: null,
    details: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    archivedAt: null,
    ...overrides,
  };
}

function buildItemsRepository(
  overrides: Partial<LeisureItemsRepository> = {},
): LeisureItemsRepository {
  return {
    findAll: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(buildItem()),
    update: vi.fn().mockResolvedValue(buildItem()),
    delete: vi.fn().mockResolvedValue(undefined),
    createCoverUploadUrl: vi.fn(),
    ...overrides,
  };
}

function buildService(
  repository: LeisurePlanRepository,
  historyRepository: LeisureHistoryRepository = buildHistoryRepository(),
  itemsRepository: LeisureItemsRepository = buildItemsRepository(),
): LeisurePlanService {
  return new LeisurePlanService(repository, historyRepository, itemsRepository);
}

describe('LeisurePlanService.findByDateRange', () => {
  it('fetches candidates and completions, then expands them into occurrences', async () => {
    const repository = buildRepository({
      findByDateRange: vi.fn().mockResolvedValue([buildEntry({ recurrence: 'daily' })]),
      findCompletedOccurrences: vi.fn().mockResolvedValue(new Set(['plan-1|2026-01-02'])),
    });
    const service = buildService(repository);
    const user = buildAuthenticatedUser();

    const result = await service.findByDateRange(user, '2026-01-01', '2026-01-03');

    expect(repository.findByDateRange).toHaveBeenCalledWith(
      user.accessToken,
      '2026-01-01',
      '2026-01-03',
    );
    expect(repository.findCompletedOccurrences).toHaveBeenCalledWith(
      user.accessToken,
      '2026-01-01',
      '2026-01-03',
    );
    // One daily entry expands into 3 occurrences over the 3-day range,
    // with only the completed one (2026-01-02) reflecting `completed: true`.
    expect(result.map((entry) => [entry.occurrenceDate, entry.completed])).toEqual([
      ['2026-01-01', false],
      ['2026-01-02', true],
      ['2026-01-03', false],
    ]);
  });

  it('leaves a non-recurring entry as a single occurrence', async () => {
    const repository = buildRepository({
      findByDateRange: vi.fn().mockResolvedValue([buildEntry({ date: '2026-01-02' })]),
    });
    const service = buildService(repository);

    const result = await service.findByDateRange(
      buildAuthenticatedUser(),
      '2026-01-01',
      '2026-01-03',
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.occurrenceDate).toBe('2026-01-02');
  });
});

describe('LeisurePlanService.findById', () => {
  it('returns the entry from the repository', async () => {
    const repository = buildRepository({
      findById: vi.fn().mockResolvedValue(buildEntry({ id: 'plan-1', title: 'Watch a movie' })),
    });
    const service = buildService(repository);
    const user = buildAuthenticatedUser();

    const result = await service.findById(user, 'plan-1');

    expect(repository.findById).toHaveBeenCalledWith(user.accessToken, 'plan-1');
    expect(result.title).toBe('Watch a movie');
  });

  it('throws LeisurePlanEntryNotFoundError when the repository returns null', async () => {
    const repository = buildRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = buildService(repository);

    await expect(service.findById(buildAuthenticatedUser(), 'missing')).rejects.toBeInstanceOf(
      LeisurePlanEntryNotFoundError,
    );
  });
});

describe('LeisurePlanService.create', () => {
  it('delegates to the repository with the caller id and access token', async () => {
    const repository = buildRepository();
    const service = buildService(repository);
    const user = buildAuthenticatedUser({ id: 'user-1' });
    // Far enough in the future to never become "today"/past for this test's lifetime.
    const input = { title: 'Watch a movie', date: '2099-01-01' };

    await service.create(user, input);

    expect(repository.create).toHaveBeenCalledWith(user.accessToken, 'user-1', input);
  });

  it('rejects a date in the past without touching the repository', async () => {
    const repository = buildRepository();
    const service = buildService(repository);
    const input = { title: 'Watch a movie', date: '2000-01-01' };

    await expect(service.create(buildAuthenticatedUser(), input)).rejects.toBeInstanceOf(
      LeisurePlanEntryDateInvalidError,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });
});

describe('LeisurePlanService.update', () => {
  it('returns the updated entry', async () => {
    const repository = buildRepository({
      update: vi.fn().mockResolvedValue(buildEntry({ title: 'Renamed' })),
    });
    const service = buildService(repository);

    const result = await service.update(buildAuthenticatedUser(), 'plan-1', { title: 'Renamed' });

    expect(result.title).toBe('Renamed');
  });

  it('throws LeisurePlanEntryNotFoundError when the repository returns null', async () => {
    const repository = buildRepository({ update: vi.fn().mockResolvedValue(null) });
    const service = buildService(repository);

    await expect(
      service.update(buildAuthenticatedUser(), 'missing', { title: 'x' }),
    ).rejects.toBeInstanceOf(LeisurePlanEntryNotFoundError);
  });

  it('does not look up the existing entry when the patch never touches date/startTime/endTime', async () => {
    const repository = buildRepository();
    const service = buildService(repository);

    await service.update(buildAuthenticatedUser(), 'plan-1', { title: 'Renamed' });

    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('allows keeping an already-past date unchanged (e.g. editing just the notes)', async () => {
    const repository = buildRepository({
      findById: vi.fn().mockResolvedValue(buildEntry({ date: '2000-01-01' })),
    });
    const service = buildService(repository);

    await service.update(buildAuthenticatedUser(), 'plan-1', {
      date: '2000-01-01',
      notes: 'Updated notes',
    });

    expect(repository.update).toHaveBeenCalledWith(expect.any(String), 'plan-1', {
      date: '2000-01-01',
      notes: 'Updated notes',
    });
  });

  it('rejects rescheduling an entry to a new past date', async () => {
    const repository = buildRepository({
      findById: vi.fn().mockResolvedValue(buildEntry({ date: '2099-01-01' })),
    });
    const service = buildService(repository);

    await expect(
      service.update(buildAuthenticatedUser(), 'plan-1', { date: '2000-01-01' }),
    ).rejects.toBeInstanceOf(LeisurePlanEntryDateInvalidError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('throws LeisurePlanEntryNotFoundError when the entry to reschedule does not exist', async () => {
    const repository = buildRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = buildService(repository);

    await expect(
      service.update(buildAuthenticatedUser(), 'missing', { date: '2099-01-01' }),
    ).rejects.toBeInstanceOf(LeisurePlanEntryNotFoundError);
  });
});

describe('LeisurePlanService.delete', () => {
  it('delegates to the repository', async () => {
    const repository = buildRepository();
    const service = buildService(repository);
    const user = buildAuthenticatedUser();

    await service.delete(user, 'plan-1');

    expect(repository.delete).toHaveBeenCalledWith(user.accessToken, 'plan-1');
  });
});

describe('LeisurePlanService.complete', () => {
  it('patches completed to true for a non-recurring entry', async () => {
    const repository = buildRepository({
      findById: vi.fn().mockResolvedValue(buildEntry({ recurrence: 'none' })),
    });
    const service = buildService(repository);
    const user = buildAuthenticatedUser();

    await service.complete(user, 'plan-1');

    expect(repository.update).toHaveBeenCalledWith(user.accessToken, 'plan-1', {
      completed: true,
    });
    expect(repository.markOccurrenceCompleted).not.toHaveBeenCalled();
  });

  it('throws LeisurePlanEntryNotFoundError when the entry does not exist', async () => {
    const repository = buildRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = buildService(repository);

    await expect(service.complete(buildAuthenticatedUser(), 'missing')).rejects.toBeInstanceOf(
      LeisurePlanEntryNotFoundError,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('records a per-occurrence completion for a daily entry, defaulting to its own anchor date', async () => {
    const repository = buildRepository({
      findById: vi.fn().mockResolvedValue(buildEntry({ recurrence: 'daily', date: '2026-01-01' })),
    });
    const service = buildService(repository);
    const user = buildAuthenticatedUser({ id: 'user-1' });

    const result = await service.complete(user, 'plan-1');

    expect(repository.markOccurrenceCompleted).toHaveBeenCalledWith(
      user.accessToken,
      'user-1',
      'plan-1',
      '2026-01-01',
    );
    expect(repository.update).not.toHaveBeenCalled();
    expect(result.occurrenceDate).toBe('2026-01-01');
    expect(result.completed).toBe(true);
  });

  it('records a per-occurrence completion for the given date, leaving other occurrences untouched', async () => {
    const repository = buildRepository({
      findById: vi.fn().mockResolvedValue(buildEntry({ recurrence: 'weekly', date: '2026-01-01' })),
    });
    const service = buildService(repository);
    const user = buildAuthenticatedUser({ id: 'user-1' });

    const result = await service.complete(user, 'plan-1', '2026-01-15');

    expect(repository.markOccurrenceCompleted).toHaveBeenCalledWith(
      user.accessToken,
      'user-1',
      'plan-1',
      '2026-01-15',
    );
    expect(result.occurrenceDate).toBe('2026-01-15');
  });

  it("logs a history entry as 'custom' for an ad hoc (no leisureItemId) entry", async () => {
    const repository = buildRepository({
      findById: vi.fn().mockResolvedValue(buildEntry({ recurrence: 'none', leisureItemId: null })),
    });
    const historyRepository = buildHistoryRepository();
    const itemsRepository = buildItemsRepository();
    const service = buildService(repository, historyRepository, itemsRepository);
    const user = buildAuthenticatedUser({ id: 'user-1' });

    await service.complete(user, 'plan-1');

    expect(itemsRepository.findById).not.toHaveBeenCalled();
    expect(historyRepository.create).toHaveBeenCalledWith(
      user.accessToken,
      'user-1',
      expect.objectContaining({
        leisureItemId: null,
        activityType: 'custom',
        title: 'Watch a movie',
        duration: 120,
      }),
    );
  });

  it('resolves activityType from the linked leisure item when one is set', async () => {
    const repository = buildRepository({
      findById: vi
        .fn()
        .mockResolvedValue(buildEntry({ recurrence: 'none', leisureItemId: 'item-1' })),
    });
    const historyRepository = buildHistoryRepository();
    const itemsRepository = buildItemsRepository({
      findById: vi.fn().mockResolvedValue(buildItem({ id: 'item-1', type: 'book' })),
    });
    const service = buildService(repository, historyRepository, itemsRepository);
    const user = buildAuthenticatedUser();

    await service.complete(user, 'plan-1');

    expect(itemsRepository.findById).toHaveBeenCalledWith(user.accessToken, 'item-1');
    expect(historyRepository.create).toHaveBeenCalledWith(
      user.accessToken,
      user.id,
      expect.objectContaining({ leisureItemId: 'item-1', activityType: 'book' }),
    );
  });

  it("falls back to 'custom' when the linked item no longer exists", async () => {
    const repository = buildRepository({
      findById: vi
        .fn()
        .mockResolvedValue(buildEntry({ recurrence: 'none', leisureItemId: 'deleted-item' })),
    });
    const historyRepository = buildHistoryRepository();
    const itemsRepository = buildItemsRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = buildService(repository, historyRepository, itemsRepository);

    await service.complete(buildAuthenticatedUser(), 'plan-1');

    expect(historyRepository.create).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ activityType: 'custom' }),
    );
  });

  it('never logs twice for an already-completed non-recurring entry', async () => {
    const repository = buildRepository({
      findById: vi.fn().mockResolvedValue(buildEntry({ recurrence: 'none', completed: true })),
    });
    const historyRepository = buildHistoryRepository();
    const service = buildService(repository, historyRepository);

    const result = await service.complete(buildAuthenticatedUser(), 'plan-1');

    expect(repository.update).not.toHaveBeenCalled();
    expect(historyRepository.create).not.toHaveBeenCalled();
    expect(result.completed).toBe(true);
  });

  it('logs a history entry the first time a recurring occurrence is completed', async () => {
    const repository = buildRepository({
      findById: vi.fn().mockResolvedValue(buildEntry({ recurrence: 'daily', date: '2026-01-01' })),
      markOccurrenceCompleted: vi.fn().mockResolvedValue(true),
    });
    const historyRepository = buildHistoryRepository();
    const service = buildService(repository, historyRepository);

    await service.complete(buildAuthenticatedUser(), 'plan-1');

    expect(historyRepository.create).toHaveBeenCalledTimes(1);
  });

  it('never logs twice for the same recurring occurrence', async () => {
    const repository = buildRepository({
      findById: vi.fn().mockResolvedValue(buildEntry({ recurrence: 'daily', date: '2026-01-01' })),
      markOccurrenceCompleted: vi.fn().mockResolvedValue(false),
    });
    const historyRepository = buildHistoryRepository();
    const service = buildService(repository, historyRepository);

    await service.complete(buildAuthenticatedUser(), 'plan-1');

    expect(historyRepository.create).not.toHaveBeenCalled();
  });
});
