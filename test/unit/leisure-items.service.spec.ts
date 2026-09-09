import { describe, expect, it, vi } from 'vitest';
import {
  LeisureItemDetailsInvalidError,
  LeisureItemNotFoundError,
} from '../../src/common/errors/app.error';
import { LeisureItemsService } from '../../src/modules/leisure/leisure-items.service';
import { LeisureItemsRepository } from '../../src/modules/leisure/types/leisure-items-repository.interface';
import { LeisureItem } from '../../src/modules/leisure/types/leisure-item.type';
import { buildAuthenticatedUser } from '../factories/authenticated-user.factory';

function buildItem(overrides: Partial<LeisureItem> = {}): LeisureItem {
  return {
    id: 'item-1',
    userId: 'user-1',
    type: 'movie',
    title: 'Dune',
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
    details: { runtime: 120 },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    archivedAt: null,
    ...overrides,
  };
}

function buildRepository(overrides: Partial<LeisureItemsRepository> = {}): LeisureItemsRepository {
  return {
    findAll: vi.fn().mockResolvedValue([buildItem()]),
    findById: vi.fn().mockResolvedValue(buildItem()),
    create: vi.fn().mockResolvedValue(buildItem()),
    update: vi.fn().mockResolvedValue(buildItem()),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('LeisureItemsService.findAll', () => {
  it('delegates to the repository with the caller access token', async () => {
    const repository = buildRepository();
    const service = new LeisureItemsService(repository);
    const user = buildAuthenticatedUser();

    await service.findAll(user, { type: 'movie' });

    expect(repository.findAll).toHaveBeenCalledWith(user.accessToken, { type: 'movie' });
  });
});

describe('LeisureItemsService.findById', () => {
  it('returns the item when found', async () => {
    const repository = buildRepository();
    const service = new LeisureItemsService(repository);

    await expect(service.findById(buildAuthenticatedUser(), 'item-1')).resolves.toEqual(
      buildItem(),
    );
  });

  it('throws LeisureItemNotFoundError when the repository returns null', async () => {
    const repository = buildRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new LeisureItemsService(repository);

    await expect(service.findById(buildAuthenticatedUser(), 'missing')).rejects.toBeInstanceOf(
      LeisureItemNotFoundError,
    );
  });
});

describe('LeisureItemsService.create', () => {
  it('delegates to the repository with the caller id and access token', async () => {
    const repository = buildRepository();
    const service = new LeisureItemsService(repository);
    const user = buildAuthenticatedUser({ id: 'user-1' });
    const input = { type: 'movie' as const, title: 'Dune', details: {} };

    await service.create(user, input);

    expect(repository.create).toHaveBeenCalledWith(user.accessToken, 'user-1', input);
  });
});

describe('LeisureItemsService.update', () => {
  it('returns the updated item', async () => {
    const repository = buildRepository({
      update: vi.fn().mockResolvedValue(buildItem({ title: 'Renamed' })),
    });
    const service = new LeisureItemsService(repository);

    const result = await service.update(buildAuthenticatedUser(), 'item-1', { title: 'Renamed' });

    expect(result.title).toBe('Renamed');
  });

  it('throws LeisureItemNotFoundError when the repository returns null', async () => {
    const repository = buildRepository({ update: vi.fn().mockResolvedValue(null) });
    const service = new LeisureItemsService(repository);

    await expect(
      service.update(buildAuthenticatedUser(), 'missing', { title: 'x' }),
    ).rejects.toBeInstanceOf(LeisureItemNotFoundError);
  });
});

describe('LeisureItemsService.delete', () => {
  it('delegates to the repository', async () => {
    const repository = buildRepository();
    const service = new LeisureItemsService(repository);
    const user = buildAuthenticatedUser();

    await service.delete(user, 'item-1');

    expect(repository.delete).toHaveBeenCalledWith(user.accessToken, 'item-1');
  });
});

describe('LeisureItemsService.toggleFavorite', () => {
  it('flips favorite from false to true', async () => {
    const repository = buildRepository({
      findById: vi.fn().mockResolvedValue(buildItem({ favorite: false })),
    });
    const service = new LeisureItemsService(repository);
    const user = buildAuthenticatedUser();

    await service.toggleFavorite(user, 'item-1');

    expect(repository.update).toHaveBeenCalledWith(user.accessToken, 'item-1', {
      favorite: true,
    });
  });

  it('flips favorite from true to false', async () => {
    const repository = buildRepository({
      findById: vi.fn().mockResolvedValue(buildItem({ favorite: true })),
    });
    const service = new LeisureItemsService(repository);
    const user = buildAuthenticatedUser();

    await service.toggleFavorite(user, 'item-1');

    expect(repository.update).toHaveBeenCalledWith(user.accessToken, 'item-1', {
      favorite: false,
    });
  });

  it('throws LeisureItemNotFoundError when the item does not exist', async () => {
    const repository = buildRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new LeisureItemsService(repository);

    await expect(
      service.toggleFavorite(buildAuthenticatedUser(), 'missing'),
    ).rejects.toBeInstanceOf(LeisureItemNotFoundError);
  });
});

describe('LeisureItemsService.archive', () => {
  it('sets status to archived', async () => {
    const repository = buildRepository();
    const service = new LeisureItemsService(repository);
    const user = buildAuthenticatedUser();

    await service.archive(user, 'item-1');

    expect(repository.update).toHaveBeenCalledWith(user.accessToken, 'item-1', {
      status: 'archived',
    });
  });
});

describe('LeisureItemsService.updateProgress', () => {
  it('merges the progress patch into details and persists it when valid', async () => {
    const repository = buildRepository({
      findById: vi.fn().mockResolvedValue(buildItem({ type: 'book', details: { pages: 300 } })),
    });
    const service = new LeisureItemsService(repository);
    const user = buildAuthenticatedUser();

    await service.updateProgress(user, 'item-1', { progress: { currentPage: 155 } });

    expect(repository.update).toHaveBeenCalledWith(user.accessToken, 'item-1', {
      details: { pages: 300, currentPage: 155 },
    });
  });

  it('never touches base fields, only the details slice', async () => {
    const repository = buildRepository({
      findById: vi.fn().mockResolvedValue(buildItem({ type: 'book', details: {} })),
    });
    const service = new LeisureItemsService(repository);

    await service.updateProgress(buildAuthenticatedUser(), 'item-1', {
      progress: { currentPage: 10 },
    });

    const patch = (repository.update as ReturnType<typeof vi.fn>).mock.calls[0]![2];
    expect(Object.keys(patch)).toEqual(['details']);
  });

  it('throws LeisureItemDetailsInvalidError when the merged slice fails validation', async () => {
    const repository = buildRepository({
      findById: vi.fn().mockResolvedValue(buildItem({ type: 'book', details: {} })),
    });
    const service = new LeisureItemsService(repository);

    await expect(
      service.updateProgress(buildAuthenticatedUser(), 'item-1', {
        progress: { currentPage: -5 },
      }),
    ).rejects.toBeInstanceOf(LeisureItemDetailsInvalidError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('throws LeisureItemNotFoundError when the item does not exist', async () => {
    const repository = buildRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new LeisureItemsService(repository);

    await expect(
      service.updateProgress(buildAuthenticatedUser(), 'missing', { progress: {} }),
    ).rejects.toBeInstanceOf(LeisureItemNotFoundError);
  });
});

describe('LeisureItemsService.reclassify', () => {
  it('patches type and details atomically', async () => {
    const repository = buildRepository();
    const service = new LeisureItemsService(repository);
    const user = buildAuthenticatedUser();

    await service.reclassify(user, 'item-1', { type: 'book', details: { pages: 10 } });

    expect(repository.update).toHaveBeenCalledWith(user.accessToken, 'item-1', {
      type: 'book',
      details: { pages: 10 },
    });
  });
});
