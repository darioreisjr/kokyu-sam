import { describe, expect, it } from 'vitest';
import {
  createLeisureItemSchema,
  listLeisureItemsQuerySchema,
  updateLeisureItemSchema,
} from '../../src/modules/leisure/schemas/leisure-item.schemas';
import {
  createNoteSchema,
  listNotesQuerySchema,
  updateNoteSchema,
} from '../../src/modules/leisure/schemas/leisure-note.schemas';
import { normalizeTag, tagsSchema } from '../../src/modules/leisure/schemas/leisure-tags.schema';

describe('normalizeTag', () => {
  it('lower-cases, trims and collapses inner whitespace, keeping accents and spaces', () => {
    expect(normalizeTag('  Fim   de Semana ')).toBe('fim de semana');
    expect(normalizeTag('RÁPIDO')).toBe('rápido');
    expect(normalizeTag('Em-Casa')).toBe('em-casa');
  });
});

describe('tagsSchema', () => {
  it('normalizes every tag and removes duplicates that differ only in case/spacing', () => {
    expect(tagsSchema.parse(['Praia', 'praia', ' PRAIA ', 'Fim de  Semana'])).toEqual([
      'praia',
      'fim de semana',
    ]);
  });

  it('rejects blank tags, tags over 40 characters and more than 30 tags', () => {
    expect(tagsSchema.safeParse(['   ']).success).toBe(false);
    expect(tagsSchema.safeParse(['a'.repeat(41)]).success).toBe(false);
    expect(tagsSchema.safeParse(Array.from({ length: 31 }, (_, i) => `t${i}`)).success).toBe(false);
  });
});

describe('tags on notes and leisure items', () => {
  it('normalizes tags on note create and update', () => {
    expect(
      createNoteSchema.parse({ content: 'x', type: 'text', tags: ['Trabalho', 'TRABALHO'] }).tags,
    ).toEqual(['trabalho']);
    expect(updateNoteSchema.parse({ tags: ['Ideias'] }).tags).toEqual(['ideias']);
  });

  it('normalizes the ?tag= filter on notes and leisure items', () => {
    expect(listNotesQuerySchema.parse({ tag: ' Praia ' }).tag).toBe('praia');
    expect(listLeisureItemsQuerySchema.parse({ tag: 'Em Casa' }).tag).toBe('em casa');
  });

  it('normalizes tags on leisure item create and update', () => {
    const created = createLeisureItemSchema.safeParse({
      type: 'movie',
      title: 'Dune',
      tags: ['Sci-Fi', 'sci-fi'],
    });
    expect(created.success).toBe(true);
    expect(created.success && created.data.tags).toEqual(['sci-fi']);

    const updated = updateLeisureItemSchema.safeParse({ tags: ['Relaxar'] });
    expect(updated.success).toBe(true);
    expect(updated.success && updated.data.tags).toEqual(['relaxar']);
  });
});
