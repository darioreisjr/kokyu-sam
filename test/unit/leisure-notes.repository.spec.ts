import { describe, expect, it, vi } from 'vitest';
import { SupabaseLeisureNotesRepository } from '../../src/modules/leisure/leisure-notes.repository';
import { LeisureNote } from '../../src/modules/leisure/types/leisure-note.type';

function buildNoteRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'note-1',
    user_id: 'user-1',
    title: 'Ideas',
    content: 'Watch more movies',
    type: 'text',
    checklist_items: null,
    link_url: null,
    tags: ['fun'],
    pinned: false,
    archived: false,
    reminder_date: null,
    related_leisure_item_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildExpectedNote(overrides: Partial<LeisureNote> = {}): LeisureNote {
  return {
    id: 'note-1',
    userId: 'user-1',
    title: 'Ideas',
    content: 'Watch more movies',
    type: 'text',
    checklistItems: null,
    linkUrl: null,
    tags: ['fun'],
    pinned: false,
    archived: false,
    reminderDate: null,
    relatedEntity: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

type SupabaseArg = ConstructorParameters<typeof SupabaseLeisureNotesRepository>[0];

function buildRepository(client: unknown): SupabaseLeisureNotesRepository {
  const supabase = { getUserScopedClient: () => client } as unknown as SupabaseArg;
  return new SupabaseLeisureNotesRepository(supabase);
}

describe('SupabaseLeisureNotesRepository.findAll', () => {
  it('maps rows into domain notes with no filters applied', async () => {
    const order = vi.fn(() => Promise.resolve({ data: [buildNoteRow()], error: null }));
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));
    const repository = buildRepository({ from });

    const notes = await repository.findAll('token', {});

    expect(notes).toEqual([buildExpectedNote()]);
  });

  it('applies pinned/archived/tag/relatedItemId filters when present', async () => {
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
      then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
        resolve({ data: [], error: null }),
    });
    const order = vi.fn(() => chainable());
    const select = vi.fn(() => ({ order }));
    const repository = buildRepository({ from: () => ({ select }) });

    await repository.findAll('token', {
      pinned: true,
      archived: false,
      tag: 'fun',
      relatedItemId: 'item-1',
    });

    expect(calls).toEqual([
      'eq:pinned',
      'eq:archived',
      'contains:tags',
      'eq:related_leisure_item_id',
    ]);
  });

  it('maps a related_leisure_item_id row into a relatedEntity', async () => {
    const order = vi.fn(() =>
      Promise.resolve({
        data: [buildNoteRow({ related_leisure_item_id: 'item-1' })],
        error: null,
      }),
    );
    const select = vi.fn(() => ({ order }));
    const repository = buildRepository({ from: () => ({ select }) });

    const notes = await repository.findAll('token', {});

    expect(notes[0]!.relatedEntity).toEqual({ entityType: 'leisureItem', entityId: 'item-1' });
  });
});

describe('SupabaseLeisureNotesRepository.findById', () => {
  it('maps a found row', async () => {
    const maybeSingle = vi.fn(() => Promise.resolve({ data: buildNoteRow(), error: null }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ select }) });

    await expect(repository.findById('token', 'note-1')).resolves.toEqual(buildExpectedNote());
  });

  it('returns null when no row is found', async () => {
    const maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ select }) });

    await expect(repository.findById('token', 'missing')).resolves.toBeNull();
  });
});

describe('SupabaseLeisureNotesRepository.create', () => {
  it('inserts with defaults and maps the returned row', async () => {
    const single = vi.fn(() => Promise.resolve({ data: buildNoteRow(), error: null }));
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const repository = buildRepository({ from: () => ({ insert }) });

    const note = await repository.create('token', 'user-1', {
      content: 'Watch more movies',
      type: 'text',
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        content: 'Watch more movies',
        type: 'text',
        checklist_items: [],
        tags: [],
        pinned: false,
        archived: false,
      }),
    );
    expect(note).toEqual(buildExpectedNote());
  });

  it('persists related_leisure_item_id from relatedEntity', async () => {
    const single = vi.fn(() => Promise.resolve({ data: buildNoteRow(), error: null }));
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const repository = buildRepository({ from: () => ({ insert }) });

    await repository.create('token', 'user-1', {
      content: 'x',
      type: 'text',
      relatedEntity: { entityType: 'leisureItem', entityId: 'item-9' },
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ related_leisure_item_id: 'item-9' }),
    );
  });
});

describe('SupabaseLeisureNotesRepository.update', () => {
  it('only sets fields present in the patch', async () => {
    const maybeSingle = vi.fn(() =>
      Promise.resolve({ data: buildNoteRow({ pinned: true }), error: null }),
    );
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ update }) });

    const note = await repository.update('token', 'note-1', { pinned: true });

    expect(update).toHaveBeenCalledWith({ pinned: true });
    expect(note?.pinned).toBe(true);
  });

  it('maps checklistItems and clears relatedEntity when explicitly set to null', async () => {
    const maybeSingle = vi.fn(() => Promise.resolve({ data: buildNoteRow(), error: null }));
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ update }) });

    await repository.update('token', 'note-1', {
      checklistItems: [{ id: 'a', text: 'x', checked: false }],
      relatedEntity: null,
    });

    expect(update).toHaveBeenCalledWith({
      checklist_items: [{ id: 'a', text: 'x', checked: false }],
      related_leisure_item_id: null,
    });
  });

  it('returns null when no row matched', async () => {
    const maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ update }) });

    await expect(repository.update('token', 'missing', { pinned: true })).resolves.toBeNull();
  });
});

describe('SupabaseLeisureNotesRepository.delete', () => {
  it('deletes by id', async () => {
    const eq = vi.fn(() => Promise.resolve({ error: null }));
    const del = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ delete: del }) });

    await repository.delete('token', 'note-1');

    expect(eq).toHaveBeenCalledWith('id', 'note-1');
  });

  it('throws a mapped error when delete fails', async () => {
    const eq = vi.fn(() => Promise.resolve({ error: { code: 'XX000', message: 'boom' } }));
    const del = vi.fn(() => ({ eq }));
    const repository = buildRepository({ from: () => ({ delete: del }) });

    await expect(repository.delete('token', 'note-1')).rejects.toBeInstanceOf(Error);
  });
});
