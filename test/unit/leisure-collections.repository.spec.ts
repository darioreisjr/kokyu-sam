import { describe, expect, it, vi } from 'vitest';
import { SupabaseLeisureCollectionsRepository } from '../../src/modules/leisure/leisure-collections.repository';
import { LeisureCollection } from '../../src/modules/leisure/types/leisure-collection.type';

function buildCollectionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'collection-1',
    user_id: 'user-1',
    name: 'Weekend picks',
    description: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildExpectedCollection(overrides: Partial<LeisureCollection> = {}): LeisureCollection {
  return {
    id: 'collection-1',
    userId: 'user-1',
    name: 'Weekend picks',
    description: null,
    itemIds: ['item-1', 'item-2'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

type SupabaseArg = ConstructorParameters<typeof SupabaseLeisureCollectionsRepository>[0];

function buildRepository(client: unknown): SupabaseLeisureCollectionsRepository {
  const supabase = { getUserScopedClient: () => client } as unknown as SupabaseArg;
  return new SupabaseLeisureCollectionsRepository(supabase);
}

/**
 * Builds a `from()` that dispatches per table: `leisure_collections` for the
 * main row query/mutation, `leisure_collection_items` for the junction-table
 * lookup that `toDomain` always issues afterwards.
 */
function buildClient(options: {
  collectionsHandlers: () => Record<string, unknown>;
  itemIds?: string[];
  junctionError?: { code: string; message: string } | null;
}) {
  const { collectionsHandlers, itemIds = ['item-1', 'item-2'], junctionError = null } = options;
  const order = vi.fn(() =>
    Promise.resolve({ data: itemIds.map((id) => ({ item_id: id })), error: junctionError }),
  );
  const eqJunction = vi.fn(() => ({ order }));
  const selectJunction = vi.fn(() => ({ eq: eqJunction }));

  const from = vi.fn((table: string) => {
    if (table === 'leisure_collection_items') {
      return { select: selectJunction };
    }
    return collectionsHandlers();
  });

  return { from, order, eqJunction, selectJunction };
}

describe('SupabaseLeisureCollectionsRepository.findAll', () => {
  it('maps each row and fetches its member itemIds from the junction table', async () => {
    const order = vi.fn(() => Promise.resolve({ data: [buildCollectionRow()], error: null }));
    const select = vi.fn(() => ({ order }));
    const { from } = buildClient({ collectionsHandlers: () => ({ select }) });
    const repository = buildRepository({ from });

    const collections = await repository.findAll('token');

    expect(collections).toEqual([buildExpectedCollection()]);
    expect(from).toHaveBeenCalledWith('leisure_collections');
    expect(from).toHaveBeenCalledWith('leisure_collection_items');
  });

  it('returns an empty array when there are no collections', async () => {
    const order = vi.fn(() => Promise.resolve({ data: [], error: null }));
    const select = vi.fn(() => ({ order }));
    const { from } = buildClient({ collectionsHandlers: () => ({ select }) });
    const repository = buildRepository({ from });

    await expect(repository.findAll('token')).resolves.toEqual([]);
  });

  it('throws a mapped error when the collections query fails', async () => {
    const order = vi.fn(() =>
      Promise.resolve({ data: null, error: { code: 'XX000', message: 'boom' } }),
    );
    const select = vi.fn(() => ({ order }));
    const { from } = buildClient({ collectionsHandlers: () => ({ select }) });
    const repository = buildRepository({ from });

    await expect(repository.findAll('token')).rejects.toBeInstanceOf(Error);
  });

  it('throws a mapped error when the junction-table query fails', async () => {
    const order = vi.fn(() => Promise.resolve({ data: [buildCollectionRow()], error: null }));
    const select = vi.fn(() => ({ order }));
    const { from } = buildClient({
      collectionsHandlers: () => ({ select }),
      junctionError: { code: 'XX000', message: 'boom' },
    });
    const repository = buildRepository({ from });

    await expect(repository.findAll('token')).rejects.toBeInstanceOf(Error);
  });
});

describe('SupabaseLeisureCollectionsRepository.findById', () => {
  it('maps a found row with its itemIds', async () => {
    const maybeSingle = vi.fn(() => Promise.resolve({ data: buildCollectionRow(), error: null }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const { from } = buildClient({ collectionsHandlers: () => ({ select }) });
    const repository = buildRepository({ from });

    await expect(repository.findById('token', 'collection-1')).resolves.toEqual(
      buildExpectedCollection(),
    );
  });

  it('returns null when no row is found (without querying the junction table)', async () => {
    const maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const { from } = buildClient({ collectionsHandlers: () => ({ select }) });
    const repository = buildRepository({ from });

    await expect(repository.findById('token', 'missing')).resolves.toBeNull();
    expect(from).not.toHaveBeenCalledWith('leisure_collection_items');
  });
});

describe('SupabaseLeisureCollectionsRepository.create', () => {
  it('inserts the collection row and links any given itemIds', async () => {
    const single = vi.fn(() => Promise.resolve({ data: buildCollectionRow(), error: null }));
    const selectInsert = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select: selectInsert }));
    const linkInsert = vi.fn(() => Promise.resolve({ error: null }));

    const order = vi.fn(() =>
      Promise.resolve({ data: [{ item_id: 'item-1' }, { item_id: 'item-2' }], error: null }),
    );
    const eqJunction = vi.fn(() => ({ order }));
    const selectJunction = vi.fn(() => ({ eq: eqJunction }));

    const from = vi.fn((table: string) => {
      if (table === 'leisure_collection_items') {
        return { select: selectJunction, insert: linkInsert };
      }
      return { insert };
    });
    const repository = buildRepository({ from });

    const collection = await repository.create('token', 'user-1', {
      name: 'Weekend picks',
      itemIds: ['item-1', 'item-2'],
    });

    expect(insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      name: 'Weekend picks',
      description: null,
    });
    expect(linkInsert).toHaveBeenCalledWith([
      { collection_id: 'collection-1', item_id: 'item-1', user_id: 'user-1' },
      { collection_id: 'collection-1', item_id: 'item-2', user_id: 'user-1' },
    ]);
    expect(collection).toEqual(buildExpectedCollection());
  });

  it('skips the link insert when no itemIds are given', async () => {
    const single = vi.fn(() => Promise.resolve({ data: buildCollectionRow(), error: null }));
    const selectInsert = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select: selectInsert }));
    const linkInsert = vi.fn(() => Promise.resolve({ error: null }));

    const order = vi.fn(() => Promise.resolve({ data: [], error: null }));
    const eqJunction = vi.fn(() => ({ order }));
    const selectJunction = vi.fn(() => ({ eq: eqJunction }));

    const from = vi.fn((table: string) => {
      if (table === 'leisure_collection_items') {
        return { select: selectJunction, insert: linkInsert };
      }
      return { insert };
    });
    const repository = buildRepository({ from });

    await repository.create('token', 'user-1', { name: 'Weekend picks' });

    expect(linkInsert).not.toHaveBeenCalled();
  });

  it('throws a mapped error when linking items fails', async () => {
    const single = vi.fn(() => Promise.resolve({ data: buildCollectionRow(), error: null }));
    const selectInsert = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select: selectInsert }));
    const linkInsert = vi.fn(() => Promise.resolve({ error: { code: 'XX000', message: 'boom' } }));

    const from = vi.fn((table: string) => {
      if (table === 'leisure_collection_items') {
        return { insert: linkInsert };
      }
      return { insert };
    });
    const repository = buildRepository({ from });

    await expect(
      repository.create('token', 'user-1', { name: 'x', itemIds: ['item-1'] }),
    ).rejects.toBeInstanceOf(Error);
  });
});

describe('SupabaseLeisureCollectionsRepository.update', () => {
  it('only sets fields present in the patch', async () => {
    const maybeSingle = vi.fn(() =>
      Promise.resolve({ data: buildCollectionRow({ name: 'Renamed' }), error: null }),
    );
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const { from } = buildClient({ collectionsHandlers: () => ({ update }) });
    const repository = buildRepository({ from });

    const collection = await repository.update('token', 'collection-1', { name: 'Renamed' });

    expect(update).toHaveBeenCalledWith({ name: 'Renamed' });
    expect(collection?.name).toBe('Renamed');
  });

  it('returns null when no row matched', async () => {
    const maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const { from } = buildClient({ collectionsHandlers: () => ({ update }) });
    const repository = buildRepository({ from });

    await expect(repository.update('token', 'missing', { name: 'Renamed' })).resolves.toBeNull();
  });
});

describe('SupabaseLeisureCollectionsRepository.delete', () => {
  it('deletes by id', async () => {
    const eq = vi.fn(() => Promise.resolve({ error: null }));
    const del = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ delete: del }) });

    await repository.delete('token', 'collection-1');

    expect(eq).toHaveBeenCalledWith('id', 'collection-1');
  });

  it('throws a mapped error when delete fails', async () => {
    const eq = vi.fn(() => Promise.resolve({ error: { code: 'XX000', message: 'boom' } }));
    const del = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ delete: del }) });

    await expect(repository.delete('token', 'collection-1')).rejects.toBeInstanceOf(Error);
  });
});

describe('SupabaseLeisureCollectionsRepository.addItem', () => {
  it('upserts the link with ignoreDuplicates and returns the refreshed collection', async () => {
    const upsert = vi.fn(() => Promise.resolve({ error: null }));
    const maybeSingle = vi.fn(() => Promise.resolve({ data: buildCollectionRow(), error: null }));
    const eqFind = vi.fn(() => ({ maybeSingle }));
    const selectFind = vi.fn(() => ({ eq: eqFind }));

    const order = vi.fn(() =>
      Promise.resolve({ data: [{ item_id: 'item-1' }, { item_id: 'item-2' }], error: null }),
    );
    const eqJunction = vi.fn(() => ({ order }));

    const from = vi.fn((table: string) => {
      if (table === 'leisure_collection_items') {
        return { upsert, select: () => ({ eq: eqJunction }) };
      }
      return { select: selectFind };
    });
    const repository = buildRepository({ from });

    const collection = await repository.addItem('token', 'user-1', 'collection-1', 'item-1');

    expect(upsert).toHaveBeenCalledWith(
      { collection_id: 'collection-1', item_id: 'item-1', user_id: 'user-1' },
      { onConflict: 'collection_id,item_id', ignoreDuplicates: true },
    );
    expect(collection).toEqual(buildExpectedCollection());
  });

  it('throws a mapped error when the upsert fails', async () => {
    const upsert = vi.fn(() => Promise.resolve({ error: { code: 'XX000', message: 'boom' } }));
    const from = vi.fn(() => ({ upsert }));
    const repository = buildRepository({ from });

    await expect(
      repository.addItem('token', 'user-1', 'collection-1', 'item-1'),
    ).rejects.toBeInstanceOf(Error);
  });

  it('returns null when the collection no longer exists', async () => {
    const upsert = vi.fn(() => Promise.resolve({ error: null }));
    const maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const eqFind = vi.fn(() => ({ maybeSingle }));
    const selectFind = vi.fn(() => ({ eq: eqFind }));

    const from = vi.fn((table: string) => {
      if (table === 'leisure_collection_items') return { upsert };
      return { select: selectFind };
    });
    const repository = buildRepository({ from });

    await expect(repository.addItem('token', 'user-1', 'missing', 'item-1')).resolves.toBeNull();
  });
});

describe('SupabaseLeisureCollectionsRepository.removeItem', () => {
  it('deletes the link row and returns the refreshed collection', async () => {
    const eqItem = vi.fn(() => Promise.resolve({ error: null }));
    const eqCollection = vi.fn(() => ({ eq: eqItem }));
    const del = vi.fn(() => ({ eq: eqCollection }));

    const maybeSingle = vi.fn(() => Promise.resolve({ data: buildCollectionRow(), error: null }));
    const eqFind = vi.fn(() => ({ maybeSingle }));
    const selectFind = vi.fn(() => ({ eq: eqFind }));

    const order = vi.fn(() => Promise.resolve({ data: [{ item_id: 'item-2' }], error: null }));
    const eqJunction = vi.fn(() => ({ order }));

    const from = vi.fn((table: string) => {
      if (table === 'leisure_collection_items') {
        return { delete: del, select: () => ({ eq: eqJunction }) };
      }
      return { select: selectFind };
    });
    const repository = buildRepository({ from });

    const collection = await repository.removeItem('token', 'collection-1', 'item-1');

    expect(eqCollection).toHaveBeenCalledWith('collection_id', 'collection-1');
    expect(eqItem).toHaveBeenCalledWith('item_id', 'item-1');
    expect(collection).toEqual(buildExpectedCollection({ itemIds: ['item-2'] }));
  });

  it('throws a mapped error when the delete fails', async () => {
    const eqItem = vi.fn(() => Promise.resolve({ error: { code: 'XX000', message: 'boom' } }));
    const eqCollection = vi.fn(() => ({ eq: eqItem }));
    const del = vi.fn(() => ({ eq: eqCollection }));
    const from = vi.fn(() => ({ delete: del }));
    const repository = buildRepository({ from });

    await expect(repository.removeItem('token', 'collection-1', 'item-1')).rejects.toBeInstanceOf(
      Error,
    );
  });
});
