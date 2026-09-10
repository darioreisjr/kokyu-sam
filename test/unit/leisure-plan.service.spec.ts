import { describe, expect, it, vi } from 'vitest';
import {
  LeisurePlanEntryDateInvalidError,
  LeisurePlanEntryNotFoundError,
} from '../../src/common/errors/app.error';
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
    markOccurrenceCompleted: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue(buildEntry()),
    update: vi.fn().mockResolvedValue(buildEntry()),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('LeisurePlanService.findByDateRange', () => {
  it('fetches candidates and completions, then expands them into occurrences', async () => {
    const repository = buildRepository({
      findByDateRange: vi.fn().mockResolvedValue([buildEntry({ recurrence: 'daily' })]),
      findCompletedOccurrences: vi.fn().mockResolvedValue(new Set(['plan-1|2026-01-02'])),
    });
    const service = new LeisurePlanService(repository);
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
    const service = new LeisurePlanService(repository);

    const result = await service.findByDateRange(
      buildAuthenticatedUser(),
      '2026-01-01',
      '2026-01-03',
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.occurrenceDate).toBe('2026-01-02');
  });
});

describe('LeisurePlanService.create', () => {
  it('delegates to the repository with the caller id and access token', async () => {
    const repository = buildRepository();
    const service = new LeisurePlanService(repository);
    const user = buildAuthenticatedUser({ id: 'user-1' });
    // Far enough in the future to never become "today"/past for this test's lifetime.
    const input = { title: 'Watch a movie', date: '2099-01-01' };

    await service.create(user, input);

    expect(repository.create).toHaveBeenCalledWith(user.accessToken, 'user-1', input);
  });

  it('rejects a date in the past without touching the repository', async () => {
    const repository = buildRepository();
    const service = new LeisurePlanService(repository);
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

  it('does not look up the existing entry when the patch never touches date/startTime/endTime', async () => {
    const repository = buildRepository();
    const service = new LeisurePlanService(repository);

    await service.update(buildAuthenticatedUser(), 'plan-1', { title: 'Renamed' });

    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('allows keeping an already-past date unchanged (e.g. editing just the notes)', async () => {
    const repository = buildRepository({
      findById: vi.fn().mockResolvedValue(buildEntry({ date: '2000-01-01' })),
    });
    const service = new LeisurePlanService(repository);

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
    const service = new LeisurePlanService(repository);

    await expect(
      service.update(buildAuthenticatedUser(), 'plan-1', { date: '2000-01-01' }),
    ).rejects.toBeInstanceOf(LeisurePlanEntryDateInvalidError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('throws LeisurePlanEntryNotFoundError when the entry to reschedule does not exist', async () => {
    const repository = buildRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new LeisurePlanService(repository);

    await expect(
      service.update(buildAuthenticatedUser(), 'missing', { date: '2099-01-01' }),
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
  it('patches completed to true for a non-recurring entry', async () => {
    const repository = buildRepository({
      findById: vi.fn().mockResolvedValue(buildEntry({ recurrence: 'none' })),
    });
    const service = new LeisurePlanService(repository);
    const user = buildAuthenticatedUser();

    await service.complete(user, 'plan-1');

    expect(repository.update).toHaveBeenCalledWith(user.accessToken, 'plan-1', {
      completed: true,
    });
    expect(repository.markOccurrenceCompleted).not.toHaveBeenCalled();
  });

  it('throws LeisurePlanEntryNotFoundError when the entry does not exist', async () => {
    const repository = buildRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new LeisurePlanService(repository);

    await expect(service.complete(buildAuthenticatedUser(), 'missing')).rejects.toBeInstanceOf(
      LeisurePlanEntryNotFoundError,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('records a per-occurrence completion for a daily entry, defaulting to its own anchor date', async () => {
    const repository = buildRepository({
      findById: vi.fn().mockResolvedValue(buildEntry({ recurrence: 'daily', date: '2026-01-01' })),
    });
    const service = new LeisurePlanService(repository);
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
    const service = new LeisurePlanService(repository);
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
});
