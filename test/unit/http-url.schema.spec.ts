import { describe, expect, it } from 'vitest';
import { httpUrlSchema } from '../../src/common/utils/http-url.schema';
import { createLeisureItemSchema } from '../../src/modules/leisure/schemas/leisure-item.schemas';
import { createNoteSchema } from '../../src/modules/leisure/schemas/leisure-note.schemas';

describe('httpUrlSchema', () => {
  it('accepts http and https URLs, trimmed', () => {
    expect(httpUrlSchema.parse('  https://www.astrobin.com  ')).toBe('https://www.astrobin.com');
    expect(httpUrlSchema.parse('http://example.com/a?b=1#c')).toBe('http://example.com/a?b=1#c');
  });

  it('rejects other protocols', () => {
    for (const value of [
      'javascript:alert(1)',
      'data:text/html,hi',
      'ftp://example.com',
      'mailto:a@b.com',
    ]) {
      expect(httpUrlSchema.safeParse(value).success).toBe(false);
    }
  });

  it('rejects a Markdown link pasted as-is (the bug that produced a 400 on hobby create)', () => {
    expect(
      httpUrlSchema.safeParse('https://www.astrobin.com](https://www.astrobin.com)').success,
    ).toBe(false);
  });

  it('rejects blank text and URLs over 2048 characters', () => {
    expect(httpUrlSchema.safeParse('   ').success).toBe(false);
    expect(httpUrlSchema.safeParse(`https://example.com/${'a'.repeat(2048)}`).success).toBe(false);
  });
});

describe('http-only links on leisure items and notes', () => {
  it('refuses a javascript: sourceUrl and coverImage on item create', () => {
    const base = { type: 'hobby', title: 'Astrofotografia', durationType: 'unknown' };
    expect(
      createLeisureItemSchema.safeParse({ ...base, sourceUrl: 'javascript:alert(1)' }).success,
    ).toBe(false);
    expect(
      createLeisureItemSchema.safeParse({ ...base, coverImage: 'javascript:alert(1)' }).success,
    ).toBe(false);
    expect(
      createLeisureItemSchema.safeParse({ ...base, sourceUrl: 'https://www.astrobin.com' }).success,
    ).toBe(true);
  });

  it('refuses a javascript: linkUrl on a link note', () => {
    expect(
      createNoteSchema.safeParse({ content: '', type: 'link', linkUrl: 'javascript:alert(1)' })
        .success,
    ).toBe(false);
    expect(
      createNoteSchema.safeParse({ content: '', type: 'link', linkUrl: 'https://nextjs.org/docs' })
        .success,
    ).toBe(true);
  });
});
