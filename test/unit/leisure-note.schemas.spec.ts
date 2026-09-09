import { describe, expect, it } from 'vitest';
import {
  createNoteSchema,
  listNotesQuerySchema,
  toggleChecklistItemParamsSchema,
  updateNoteSchema,
} from '../../src/modules/leisure/schemas/leisure-note.schemas';

describe('createNoteSchema', () => {
  it('accepts a minimal valid text note', () => {
    const result = createNoteSchema.safeParse({ content: 'Watch more movies', type: 'text' });
    expect(result.success).toBe(true);
  });

  it('accepts a checklist note with checklistItems', () => {
    const result = createNoteSchema.safeParse({
      content: 'x',
      type: 'checklist',
      checklistItems: [{ id: 'a', text: 'Dune', checked: false }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid note type', () => {
    expect(createNoteSchema.safeParse({ content: 'x', type: 'sticky' }).success).toBe(false);
  });

  it('rejects a non-url linkUrl', () => {
    const result = createNoteSchema.safeParse({
      content: 'x',
      type: 'link',
      linkUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a relatedEntity referencing a leisure item', () => {
    const result = createNoteSchema.safeParse({
      content: 'x',
      type: 'text',
      relatedEntity: {
        entityType: 'leisureItem',
        entityId: '11111111-1111-1111-1111-111111111111',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects content over the max length', () => {
    expect(createNoteSchema.safeParse({ content: 'a'.repeat(5001), type: 'text' }).success).toBe(
      false,
    );
  });
});

describe('updateNoteSchema', () => {
  it('allows an empty patch', () => {
    expect(updateNoteSchema.safeParse({}).success).toBe(true);
  });

  it('allows patching only pinned', () => {
    expect(updateNoteSchema.safeParse({ pinned: true }).success).toBe(true);
  });
});

describe('listNotesQuerySchema', () => {
  it('coerces pinned/archived string params to booleans', () => {
    const result = listNotesQuerySchema.safeParse({ pinned: 'true', archived: 'false' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pinned).toBe(true);
      expect(result.data.archived).toBe(false);
    }
  });

  it('rejects an invalid relatedItemId', () => {
    expect(listNotesQuerySchema.safeParse({ relatedItemId: 'not-a-uuid' }).success).toBe(false);
  });
});

describe('toggleChecklistItemParamsSchema', () => {
  it('requires a uuid noteId and a non-empty checklistItemId', () => {
    const result = toggleChecklistItemParamsSchema.safeParse({
      noteId: '11111111-1111-1111-1111-111111111111',
      checklistItemId: 'item-a',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-uuid noteId', () => {
    expect(
      toggleChecklistItemParamsSchema.safeParse({ noteId: 'not-a-uuid', checklistItemId: 'a' })
        .success,
    ).toBe(false);
  });
});
