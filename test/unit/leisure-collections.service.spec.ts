import { describe, expect, it, vi } from 'vitest';
import { LeisureCollectionNotFoundError } from '../../src/common/errors/app.error';
import { LeisureCollectionsService } from '../../src/modules/leisure/leisure-collections.service';
import { LeisureCollectionsRepository } from '../../src/modules/leisure/types/leisure-collections-repository.interface';
import { LeisureCollection } from '../../src/modules/leisure/types/leisure-collection.type';
import { buildAuthenticatedUser } from '../factories/authenticated-user.factory';

function buildCollection(overrides: Partial<LeisureCollection> = {}): LeisureCollection {
  return {
    id: 'collection-1',
    userId: 'user-1',
    name: 'Weekend picks',
    description: null,
    itemIds: ['item-1'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildRepository(
  overrides: Partial<LeisureCollectionsRepository> = {},
): LeisureCollectionsRepository {
  return {
    findAll: vi.fn().mockResolvedValue([buildCollection()]),
    findById: vi.fn().mockResolvedValue(buildCollection()),
    create: vi.fn().mockResolvedValue(buildCollection()),
    update: vi.fn().mockResolvedValue(buildCollection()),
    delete: vi.fn().mockResolvedValue(undefined),
    addItem: vi.fn().mockResolvedValue(buildCollection()),
    removeItem: vi.fn().mockResolvedValue(buildCollection()),
    ...overrides,
  };
}

describe('LeisureCollectionsService.findAll', () => {
  it('delegates to the repository', async () => {
    const repository = buildRepository();
    const service = new LeisureCollectionsService(repository);
    const user = buildAuthenticatedUser();

    await service.findAll(user);

    expect(repository.findAll).toHaveBeenCalledWith(user.accessToken);
  });
});

describe('LeisureCollectionsService.findById', () => {
  it('returns the collection when found', async () => {
    const repository = buildRepository();
    const service = new LeisureCollectionsService(repository);

    await expect(service.findById(buildAuthenticatedUser(), 'collection-1')).resolves.toEqual(
      buildCollection(),
    );
  });

  it('throws LeisureCollectionNotFoundError when the repository returns null', async () => {
    const repository = buildRepository({ findById: vi.fn().mockResolvedValue(null) });
    const service = new LeisureCollectionsService(repository);

    await expect(service.findById(buildAuthenticatedUser(), 'missing')).rejects.toBeInstanceOf(
      LeisureCollectionNotFoundError,
    );
  });
});

describe('LeisureCollectionsService.create', () => {
  it('delegates to the repository with the caller id and access token', async () => {
    const repository = buildRepository();
    const service = new LeisureCollectionsService(repository);
    const user = buildAuthenticatedUser({ id: 'user-1' });
    const input = { name: 'Weekend picks' };

    await service.create(user, input);

    expect(repository.create).toHaveBeenCalledWith(user.accessToken, 'user-1', input);
  });
});

describe('LeisureCollectionsService.update', () => {
  it('returns the updated collection', async () => {
    const repository = buildRepository({
      update: vi.fn().mockResolvedValue(buildCollection({ name: 'Renamed' })),
    });
    const service = new LeisureCollectionsService(repository);

    const result = await service.update(buildAuthenticatedUser(), 'collection-1', {
      name: 'Renamed',
    });

    expect(result.name).toBe('Renamed');
  });

  it('throws LeisureCollectionNotFoundError when the repository returns null', async () => {
    const repository = buildRepository({ update: vi.fn().mockResolvedValue(null) });
    const service = new LeisureCollectionsService(repository);

    await expect(
      service.update(buildAuthenticatedUser(), 'missing', { name: 'x' }),
    ).rejects.toBeInstanceOf(LeisureCollectionNotFoundError);
  });
});

describe('LeisureCollectionsService.delete', () => {
  it('delegates to the repository', async () => {
    const repository = buildRepository();
    const service = new LeisureCollectionsService(repository);
    const user = buildAuthenticatedUser();

    await service.delete(user, 'collection-1');

    expect(repository.delete).toHaveBeenCalledWith(user.accessToken, 'collection-1');
  });
});

describe('LeisureCollectionsService.addItem', () => {
  it('delegates to the repository with the caller id', async () => {
    const repository = buildRepository();
    const service = new LeisureCollectionsService(repository);
    const user = buildAuthenticatedUser({ id: 'user-1' });

    await service.addItem(user, 'collection-1', 'item-1');

    expect(repository.addItem).toHaveBeenCalledWith(
      user.accessToken,
      'user-1',
      'collection-1',
      'item-1',
    );
  });

  it('throws LeisureCollectionNotFoundError when the repository returns null', async () => {
    const repository = buildRepository({ addItem: vi.fn().mockResolvedValue(null) });
    const service = new LeisureCollectionsService(repository);

    await expect(
      service.addItem(buildAuthenticatedUser(), 'missing', 'item-1'),
    ).rejects.toBeInstanceOf(LeisureCollectionNotFoundError);
  });
});

describe('LeisureCollectionsService.removeItem', () => {
  it('delegates to the repository', async () => {
    const repository = buildRepository();
    const service = new LeisureCollectionsService(repository);
    const user = buildAuthenticatedUser();

    await service.removeItem(user, 'collection-1', 'item-1');

    expect(repository.removeItem).toHaveBeenCalledWith(user.accessToken, 'collection-1', 'item-1');
  });

  it('throws LeisureCollectionNotFoundError when the repository returns null', async () => {
    const repository = buildRepository({ removeItem: vi.fn().mockResolvedValue(null) });
    const service = new LeisureCollectionsService(repository);

    await expect(
      service.removeItem(buildAuthenticatedUser(), 'missing', 'item-1'),
    ).rejects.toBeInstanceOf(LeisureCollectionNotFoundError);
  });
});
