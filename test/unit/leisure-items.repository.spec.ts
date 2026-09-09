import { describe, expect, it, vi } from 'vitest';
import { SupabaseLeisureItemsRepository } from '../../src/modules/leisure/leisure-items.repository';
import { LeisureItem } from '../../src/modules/leisure/types/leisure-item.type';

function buildItemRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    user_id: 'user-1',
    type: 'movie',
    title: 'Dune',
    description: null,
    status: 'backlog',
    cover_image: null,
    tags: ['scifi'],
    priority: null,
    estimated_duration: null,
    duration_type: 'unknown',
    minimum_useful_duration: null,
    favorite: false,
    source: null,
    source_url: null,
    recommended_by: null,
    details: { runtime: 155 },
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    archived_at: null,
    ...overrides,
  };
}

function buildExpectedItem(overrides: Partial<LeisureItem> = {}): LeisureItem {
  return {
    id: 'item-1',
    userId: 'user-1',
    type: 'movie',
    title: 'Dune',
    description: null,
    status: 'backlog',
    coverImage: null,
    tags: ['scifi'],
    priority: null,
    estimatedDuration: null,
    durationType: 'unknown',
    minimumUsefulDuration: null,
    favorite: false,
    source: null,
    sourceUrl: null,
    recommendedBy: null,
    details: { runtime: 155 },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    archivedAt: null,
    ...overrides,
  };
}

type SupabaseArg = ConstructorParameters<typeof SupabaseLeisureItemsRepository>[0];

function buildRepository(client: unknown): SupabaseLeisureItemsRepository {
  const supabase = { getUserScopedClient: () => client } as unknown as SupabaseArg;
  return new SupabaseLeisureItemsRepository(supabase);
}

describe('SupabaseLeisureItemsRepository.findAll', () => {
  it('maps rows into domain items and applies no filters when none are given', async () => {
    const order = vi.fn(() => Promise.resolve({ data: [buildItemRow()], error: null }));
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));
    const repository = buildRepository({ from });

    const items = await repository.findAll('token', {});

    expect(items).toEqual([buildExpectedItem()]);
    expect(from).toHaveBeenCalledWith('leisure_items');
  });

  it('applies type/status/favorite/tag/search filters when present', async () => {
    const calls: string[] = [];
    const chainable = (): Record<string, unknown> => ({
      eq: vi.fn((field: string) => {
        calls.push(`eq:${field}`);
        return chainable();
      }),
      contains: vi.fn(() => {
        calls.push('contains:tags');
        return chainable();
      }),
      ilike: vi.fn(() => {
        calls.push('ilike:title');
        return chainable();
      }),
      then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
        resolve({ data: [], error: null }),
    });
    const order = vi.fn(() => chainable());
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));
    const repository = buildRepository({ from });

    await repository.findAll('token', {
      type: 'movie',
      status: 'backlog',
      favorite: true,
      tag: 'scifi',
      search: 'dune',
    });

    expect(calls).toEqual(['eq:type', 'eq:status', 'eq:favorite', 'contains:tags', 'ilike:title']);
  });

  it('returns an empty array when data is null', async () => {
    const order = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const select = vi.fn(() => ({ order }));
    const repository = buildRepository({ from: () => ({ select }) });

    await expect(repository.findAll('token', {})).resolves.toEqual([]);
  });

  it('throws a mapped error when the query fails', async () => {
    const order = vi.fn(() =>
      Promise.resolve({ data: null, error: { code: 'XX000', message: 'boom' } }),
    );
    const select = vi.fn(() => ({ order }));
    const repository = buildRepository({ from: () => ({ select }) });

    await expect(repository.findAll('token', {})).rejects.toBeInstanceOf(Error);
  });
});

describe('SupabaseLeisureItemsRepository.findById', () => {
  it('maps a found row', async () => {
    const maybeSingle = vi.fn(() => Promise.resolve({ data: buildItemRow(), error: null }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ select }) });

    await expect(repository.findById('token', 'item-1')).resolves.toEqual(buildExpectedItem());
    expect(eq).toHaveBeenCalledWith('id', 'item-1');
  });

  it('returns null when no row is found', async () => {
    const maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ select }) });

    await expect(repository.findById('token', 'missing')).resolves.toBeNull();
  });
});

describe('SupabaseLeisureItemsRepository.create', () => {
  it('inserts with defaults applied and maps the returned row', async () => {
    const single = vi.fn(() => Promise.resolve({ data: buildItemRow(), error: null }));
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const repository = buildRepository({ from: () => ({ insert }) });

    const item = await repository.create('token', 'user-1', {
      type: 'movie',
      title: 'Dune',
      details: { runtime: 155 },
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        type: 'movie',
        title: 'Dune',
        status: 'backlog',
        tags: [],
        duration_type: 'unknown',
        favorite: false,
        details: { runtime: 155 },
      }),
    );
    expect(item).toEqual(buildExpectedItem());
  });

  it('throws a mapped error when the insert fails', async () => {
    const single = vi.fn(() =>
      Promise.resolve({ data: null, error: { code: 'XX000', message: 'boom' } }),
    );
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const repository = buildRepository({ from: () => ({ insert }) });

    await expect(
      repository.create('token', 'user-1', { type: 'movie', title: 'Dune', details: {} }),
    ).rejects.toBeInstanceOf(Error);
  });
});

describe('SupabaseLeisureItemsRepository.update', () => {
  it('only sets fields present in the patch', async () => {
    const maybeSingle = vi.fn(() =>
      Promise.resolve({ data: buildItemRow({ favorite: true }), error: null }),
    );
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ update }) });

    const item = await repository.update('token', 'item-1', { favorite: true });

    expect(update).toHaveBeenCalledWith({ favorite: true });
    expect(item?.favorite).toBe(true);
  });

  it('maps type/details when present in the patch', async () => {
    const maybeSingle = vi.fn(() => Promise.resolve({ data: buildItemRow(), error: null }));
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ update }) });

    await repository.update('token', 'item-1', { type: 'book', details: { pages: 10 } });

    expect(update).toHaveBeenCalledWith({ type: 'book', details: { pages: 10 } });
  });

  it('returns null when no row matched', async () => {
    const maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ update }) });

    await expect(repository.update('token', 'missing', { favorite: true })).resolves.toBeNull();
  });
});

describe('SupabaseLeisureItemsRepository.delete', () => {
  it('deletes by id', async () => {
    const eq = vi.fn(() => Promise.resolve({ error: null }));
    const del = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ delete: del }) });

    await repository.delete('token', 'item-1');

    expect(del).toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith('id', 'item-1');
  });

  it('throws a mapped error when delete fails', async () => {
    const eq = vi.fn(() => Promise.resolve({ error: { code: 'XX000', message: 'boom' } }));
    const del = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ delete: del }) });

    await expect(repository.delete('token', 'item-1')).rejects.toBeInstanceOf(Error);
  });
});

describe('SupabaseLeisureItemsRepository.createCoverUploadUrl', () => {
  it('returns the signed upload target, scoped to the caller folder', async () => {
    const createSignedUploadUrl = vi.fn(() =>
      Promise.resolve({
        data: { path: 'user-1/generated.png', token: 'tok', signedUrl: 'https://upload' },
        error: null,
      }),
    );
    const repository = buildRepository({
      storage: { from: () => ({ createSignedUploadUrl }) },
    });

    const target = await repository.createCoverUploadUrl('token', 'user-1', 'png');

    expect(target).toEqual({
      path: 'user-1/generated.png',
      token: 'tok',
      signedUrl: 'https://upload',
    });
  });

  it('throws InternalError when signing fails', async () => {
    const createSignedUploadUrl = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: 'boom' } }),
    );
    const repository = buildRepository({
      storage: { from: () => ({ createSignedUploadUrl }) },
    });

    await expect(repository.createCoverUploadUrl('token', 'user-1', 'png')).rejects.toBeInstanceOf(
      Error,
    );
  });
});
