import { describe, expect, it, vi } from 'vitest';
import { LeisureCollectionsController } from '../../src/modules/leisure/leisure-collections.controller';
import { LeisureCollectionsService } from '../../src/modules/leisure/leisure-collections.service';
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

function buildService(overrides: Partial<Record<keyof LeisureCollectionsService, unknown>> = {}) {
  return {
    findAll: vi.fn().mockResolvedValue([buildCollection()]),
    findById: vi.fn().mockResolvedValue(buildCollection()),
    create: vi.fn().mockResolvedValue(buildCollection()),
    update: vi.fn().mockResolvedValue(buildCollection()),
    delete: vi.fn().mockResolvedValue(undefined),
    addItem: vi.fn().mockResolvedValue(buildCollection({ itemIds: ['item-1', 'item-2'] })),
    removeItem: vi.fn().mockResolvedValue(buildCollection({ itemIds: [] })),
    ...overrides,
  } as unknown as LeisureCollectionsService;
}

describe('LeisureCollectionsController', () => {
  it('GET / delegates to LeisureCollectionsService.findAll', async () => {
    const service = buildService();
    const controller = new LeisureCollectionsController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.findAll(user);

    expect(service.findAll).toHaveBeenCalledWith(user);
    expect(result).toEqual([buildCollection()]);
  });

  it('GET /:id delegates to LeisureCollectionsService.findById', async () => {
    const service = buildService();
    const controller = new LeisureCollectionsController(service);
    const user = buildAuthenticatedUser();

    await controller.findById(user, { id: 'collection-1' });

    expect(service.findById).toHaveBeenCalledWith(user, 'collection-1');
  });

  it('POST / delegates to LeisureCollectionsService.create', async () => {
    const service = buildService();
    const controller = new LeisureCollectionsController(service);
    const user = buildAuthenticatedUser();
    const body = { name: 'Weekend picks' };

    await controller.create(user, body);

    expect(service.create).toHaveBeenCalledWith(user, body);
  });

  it('PATCH /:id delegates to LeisureCollectionsService.update', async () => {
    const service = buildService();
    const controller = new LeisureCollectionsController(service);
    const user = buildAuthenticatedUser();
    const body = { name: 'Renamed' };

    await controller.update(user, { id: 'collection-1' }, body);

    expect(service.update).toHaveBeenCalledWith(user, 'collection-1', body);
  });

  it('DELETE /:id delegates to LeisureCollectionsService.delete', async () => {
    const service = buildService();
    const controller = new LeisureCollectionsController(service);
    const user = buildAuthenticatedUser();

    await controller.delete(user, { id: 'collection-1' });

    expect(service.delete).toHaveBeenCalledWith(user, 'collection-1');
  });

  it('POST /:id/items delegates to LeisureCollectionsService.addItem', async () => {
    const service = buildService();
    const controller = new LeisureCollectionsController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.addItem(user, { id: 'collection-1' }, { itemId: 'item-2' });

    expect(service.addItem).toHaveBeenCalledWith(user, 'collection-1', 'item-2');
    expect(result.itemIds).toEqual(['item-1', 'item-2']);
  });

  it('DELETE /:id/items/:itemId delegates to LeisureCollectionsService.removeItem', async () => {
    const service = buildService();
    const controller = new LeisureCollectionsController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.removeItem(user, { id: 'collection-1', itemId: 'item-1' });

    expect(service.removeItem).toHaveBeenCalledWith(user, 'collection-1', 'item-1');
    expect(result.itemIds).toEqual([]);
  });
});
