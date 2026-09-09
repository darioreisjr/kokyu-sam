import { describe, expect, it } from 'vitest';
import { LEISURE_ITEM_TYPES } from '../../src/modules/leisure/constants/leisure-enums.constant';
import { LEISURE_ITEM_DETAILS_SCHEMAS } from '../../src/modules/leisure/schemas/leisure-item-details.schemas';

describe('LEISURE_ITEM_DETAILS_SCHEMAS', () => {
  it('has exactly one schema per LEISURE_ITEM_TYPES entry', () => {
    expect(Object.keys(LEISURE_ITEM_DETAILS_SCHEMAS).sort()).toEqual(
      [...LEISURE_ITEM_TYPES].sort(),
    );
  });

  it('accepts an empty object for every type except place', () => {
    for (const type of LEISURE_ITEM_TYPES) {
      if (type === 'place') continue;
      const result = LEISURE_ITEM_DETAILS_SCHEMAS[type].safeParse({});
      expect(result.success, `expected ${type} to accept {}`).toBe(true);
    }
  });

  it('rejects unknown keys (every slice schema is .strict())', () => {
    const result = LEISURE_ITEM_DETAILS_SCHEMAS.movie.safeParse({ notARealField: true });
    expect(result.success).toBe(false);
  });
});

describe('movieDetailsSchema', () => {
  it('accepts a fully populated movie slice', () => {
    const result = LEISURE_ITEM_DETAILS_SCHEMAS.movie.safeParse({
      runtime: 120,
      releaseYear: 2021,
      genres: ['scifi', 'drama'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-positive runtime', () => {
    expect(LEISURE_ITEM_DETAILS_SCHEMAS.movie.safeParse({ runtime: 0 }).success).toBe(false);
  });

  it('rejects a releaseYear out of range', () => {
    expect(LEISURE_ITEM_DETAILS_SCHEMAS.movie.safeParse({ releaseYear: 1800 }).success).toBe(false);
  });
});

describe('bookDetailsSchema', () => {
  it('allows currentPage 0 (nonnegative, not positive)', () => {
    expect(LEISURE_ITEM_DETAILS_SCHEMAS.book.safeParse({ currentPage: 0 }).success).toBe(true);
  });

  it('rejects a negative currentPage', () => {
    expect(LEISURE_ITEM_DETAILS_SCHEMAS.book.safeParse({ currentPage: -1 }).success).toBe(false);
  });

  it('rejects a non-positive pages count', () => {
    expect(LEISURE_ITEM_DETAILS_SCHEMAS.book.safeParse({ pages: 0 }).success).toBe(false);
  });
});

describe('musicDetailsSchema', () => {
  it('accepts a valid "kind" enum value', () => {
    expect(LEISURE_ITEM_DETAILS_SCHEMAS.music.safeParse({ kind: 'album' }).success).toBe(true);
  });

  it('rejects an invalid "kind" value', () => {
    expect(LEISURE_ITEM_DETAILS_SCHEMAS.music.safeParse({ kind: 'symphony' }).success).toBe(false);
  });
});

describe('eventDetailsSchema', () => {
  it('accepts a nested ticket object', () => {
    const result = LEISURE_ITEM_DETAILS_SCHEMAS.event.safeParse({
      date: '2026-05-01',
      ticket: { purchased: true, price: 49.9, ticketUrl: 'https://tickets.example/x' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-url ticketUrl', () => {
    const result = LEISURE_ITEM_DETAILS_SCHEMAS.event.safeParse({
      ticket: { ticketUrl: 'not-a-url' },
    });
    expect(result.success).toBe(false);
  });
});

describe('placeDetailsSchema', () => {
  it('is the only type where category is required', () => {
    expect(LEISURE_ITEM_DETAILS_SCHEMAS.place.safeParse({}).success).toBe(false);
  });

  it('accepts a place with only category set', () => {
    expect(LEISURE_ITEM_DETAILS_SCHEMAS.place.safeParse({ category: 'restaurant' }).success).toBe(
      true,
    );
  });

  it('rejects an empty-string category', () => {
    expect(LEISURE_ITEM_DETAILS_SCHEMAS.place.safeParse({ category: '' }).success).toBe(false);
  });
});

describe('emptyDetailsSchema (video/website/activity/custom/unsorted)', () => {
  it('rejects any extra field', () => {
    for (const type of ['video', 'website', 'activity', 'custom', 'unsorted'] as const) {
      expect(LEISURE_ITEM_DETAILS_SCHEMAS[type].safeParse({ extra: 1 }).success).toBe(false);
    }
  });
});
