import { describe, expect, it, vi } from 'vitest';
import { LeisureItemsController } from '../../src/modules/leisure/leisure-items.controller';
import { LeisureItemsService } from '../../src/modules/leisure/leisure-items.service';
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

function buildService(overrides: Partial<Record<keyof LeisureItemsService, unknown>> = {}) {
  return {
    findAll: vi.fn().mockResolvedValue([buildItem()]),
    findById: vi.fn().mockResolvedValue(buildItem()),
    create: vi.fn().mockResolvedValue(buildItem()),
    update: vi.fn().mockResolvedValue(buildItem()),
    delete: vi.fn().mockResolvedValue(undefined),
    toggleFavorite: vi.fn().mockResolvedValue(buildItem({ favorite: true })),
    archive: vi.fn().mockResolvedValue(buildItem({ status: 'archived' })),
    updateProgress: vi.fn().mockResolvedValue(buildItem({ details: { currentPage: 10 } })),
    reclassify: vi.fn().mockResolvedValue(buildItem({ type: 'book' })),
    createCoverUploadUrl: vi
      .fn()
      .mockResolvedValue({ path: 'user-1/cover.png', token: 'tok', signedUrl: 'https://upload' }),
    ...overrides,
  } as unknown as LeisureItemsService;
}

describe('LeisureItemsController.toResponse (via findById)', () => {
  it('inlines details under a key named by the item type and drops the "details" key', async () => {
    const service = buildService({
      findById: vi.fn().mockResolvedValue(buildItem({ type: 'movie', details: { runtime: 120 } })),
    });
    const controller = new LeisureItemsController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.findById(user, { id: 'item-1' });

    expect(result).toEqual(expect.objectContaining({ id: 'item-1', movie: { runtime: 120 } }));
    expect(result).not.toHaveProperty('details');
  });
});

describe('LeisureItemsController.findAll', () => {
  it('maps every item through toResponse', async () => {
    const service = buildService({
      findAll: vi.fn().mockResolvedValue([buildItem({ type: 'book', details: { pages: 10 } })]),
    });
    const controller = new LeisureItemsController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.findAll(user, {});

    expect(service.findAll).toHaveBeenCalledWith(user, {});
    expect(result).toEqual([expect.objectContaining({ book: { pages: 10 } })]);
  });
});

describe('LeisureItemsController.create', () => {
  it('delegates to the service and reshapes the response', async () => {
    const service = buildService();
    const controller = new LeisureItemsController(service);
    const user = buildAuthenticatedUser();
    const body = { type: 'movie' as const, title: 'Dune', details: { runtime: 120 } };

    const result = await controller.create(user, body);

    expect(service.create).toHaveBeenCalledWith(user, body);
    expect(result).toEqual(expect.objectContaining({ movie: { runtime: 120 } }));
  });
});

describe('LeisureItemsController.update', () => {
  it('delegates to the service with params.id', async () => {
    const service = buildService();
    const controller = new LeisureItemsController(service);
    const user = buildAuthenticatedUser();
    const body = { title: 'Renamed' };

    await controller.update(user, { id: 'item-1' }, body);

    expect(service.update).toHaveBeenCalledWith(user, 'item-1', body);
  });
});

describe('LeisureItemsController.delete', () => {
  it('delegates to the service', async () => {
    const service = buildService();
    const controller = new LeisureItemsController(service);
    const user = buildAuthenticatedUser();

    await controller.delete(user, { id: 'item-1' });

    expect(service.delete).toHaveBeenCalledWith(user, 'item-1');
  });
});

describe('LeisureItemsController.toggleFavorite', () => {
  it('delegates to the service and reshapes the response', async () => {
    const service = buildService();
    const controller = new LeisureItemsController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.toggleFavorite(user, { id: 'item-1' });

    expect(service.toggleFavorite).toHaveBeenCalledWith(user, 'item-1');
    expect(result).toEqual(expect.objectContaining({ favorite: true }));
  });
});

describe('LeisureItemsController.archive', () => {
  it('delegates to the service and reshapes the response', async () => {
    const service = buildService();
    const controller = new LeisureItemsController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.archive(user, { id: 'item-1' });

    expect(service.archive).toHaveBeenCalledWith(user, 'item-1');
    expect(result).toEqual(expect.objectContaining({ status: 'archived' }));
  });
});

describe('LeisureItemsController.updateProgress', () => {
  it('delegates to the service with the progress body', async () => {
    const service = buildService();
    const controller = new LeisureItemsController(service);
    const user = buildAuthenticatedUser();
    const body = { progress: { currentPage: 10 } };

    const result = await controller.updateProgress(user, { id: 'item-1' }, body);

    expect(service.updateProgress).toHaveBeenCalledWith(user, 'item-1', body);
    expect(result).toEqual(expect.objectContaining({ movie: { currentPage: 10 } }));
  });
});

describe('LeisureItemsController.reclassify', () => {
  it('delegates to the service and reshapes the response under the new type', async () => {
    const service = buildService();
    const controller = new LeisureItemsController(service);
    const user = buildAuthenticatedUser();
    const body = { type: 'book' as const, details: { pages: 10 } };

    const result = await controller.reclassify(user, { id: 'item-1' }, body);

    expect(service.reclassify).toHaveBeenCalledWith(user, 'item-1', body);
    expect(result).toEqual(expect.objectContaining({ book: { runtime: 120 } }));
  });
});

describe('LeisureItemsController.createCoverUploadUrl', () => {
  it('delegates to the service and returns the signed upload target', async () => {
    const service = buildService();
    const controller = new LeisureItemsController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.createCoverUploadUrl(user, { contentType: 'image/png' });

    expect(service.createCoverUploadUrl).toHaveBeenCalledWith(user, { contentType: 'image/png' });
    expect(result).toEqual({ path: 'user-1/cover.png', token: 'tok', signedUrl: 'https://upload' });
  });
});
