import { describe, expect, it } from 'vitest';
import {
  coverUploadUrlSchema,
  createLeisureItemSchema,
  extensionForCoverMimeType,
  listLeisureItemsQuerySchema,
  reclassifyLeisureItemSchema,
  updateLeisureItemProgressSchema,
  updateLeisureItemSchema,
} from '../../src/modules/leisure/schemas/leisure-item.schemas';

describe('createLeisureItemSchema', () => {
  it('accepts a valid movie create and transforms it into a flat details shape', () => {
    const result = createLeisureItemSchema.safeParse({
      type: 'movie',
      title: 'Dune',
      movie: { runtime: 120 },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(
        expect.objectContaining({
          type: 'movie',
          title: 'Dune',
          details: { runtime: 120 },
          tags: [],
        }),
      );
      expect(result.data).not.toHaveProperty('movie');
    }
  });

  it('rejects invalid slice data (e.g. a negative movie runtime)', () => {
    const result = createLeisureItemSchema.safeParse({
      type: 'movie',
      title: 'Dune',
      movie: { runtime: -5 },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.path).toEqual(['movie', 'runtime']);
    }
  });

  it('defaults the slice to {} when the type key is absent, which is valid for most types', () => {
    const result = createLeisureItemSchema.safeParse({ type: 'movie', title: 'Dune' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.details).toEqual({});
    }
  });

  it('fails when the type is "place" and its required category field is missing', () => {
    const result = createLeisureItemSchema.safeParse({ type: 'place', title: 'A restaurant' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.path).toEqual(['place', 'category']);
    }
  });

  it('succeeds for "place" when category is provided', () => {
    const result = createLeisureItemSchema.safeParse({
      type: 'place',
      title: 'A restaurant',
      place: { category: 'restaurant' },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.details).toEqual({ category: 'restaurant' });
    }
  });

  it('rejects a missing title', () => {
    const result = createLeisureItemSchema.safeParse({ type: 'movie', movie: {} });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown type', () => {
    const result = createLeisureItemSchema.safeParse({ type: 'painting', title: 'x' });
    expect(result.success).toBe(false);
  });
});

describe('updateLeisureItemSchema', () => {
  it('allows a partial patch with no type at all', () => {
    const result = updateLeisureItemSchema.safeParse({ title: 'Renamed' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ title: 'Renamed' });
    }
  });

  it('validates and extracts the slice when type is sent', () => {
    const result = updateLeisureItemSchema.safeParse({ type: 'book', book: { pages: 300 } });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ type: 'book', details: { pages: 300 } });
    }
  });

  it('fails when type is "place" without category, even on a partial update', () => {
    const result = updateLeisureItemSchema.safeParse({ type: 'place' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.path).toEqual(['place', 'category']);
    }
  });

  it('rejects unknown top-level status values', () => {
    const result = updateLeisureItemSchema.safeParse({ status: 'deleted' });
    expect(result.success).toBe(false);
  });
});

describe('listLeisureItemsQuerySchema', () => {
  it('coerces the favorite string query param into a boolean', () => {
    const result = listLeisureItemsQuerySchema.safeParse({ favorite: 'true' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.favorite).toBe(true);
    }
  });

  it('leaves favorite undefined when absent', () => {
    const result = listLeisureItemsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.favorite).toBeUndefined();
    }
  });

  it('rejects an unknown query key (strict object)', () => {
    expect(listLeisureItemsQuerySchema.safeParse({ unknown: 'x' }).success).toBe(false);
  });
});

describe('updateLeisureItemProgressSchema', () => {
  it('accepts an arbitrary progress record (validated later against the item type)', () => {
    const result = updateLeisureItemProgressSchema.safeParse({ progress: { currentPage: 10 } });
    expect(result.success).toBe(true);
  });

  it('rejects a missing progress field', () => {
    expect(updateLeisureItemProgressSchema.safeParse({}).success).toBe(false);
  });
});

describe('reclassifyLeisureItemSchema', () => {
  it('validates details against the target type and defaults details to {}', () => {
    const result = reclassifyLeisureItemSchema.safeParse({ type: 'movie' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.details).toEqual({});
    }
  });

  it('fails when the target type requires a field the details slice omits', () => {
    const result = reclassifyLeisureItemSchema.safeParse({ type: 'place', details: {} });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.path).toEqual(['details', 'category']);
    }
  });

  it('succeeds when details satisfies the target type schema', () => {
    const result = reclassifyLeisureItemSchema.safeParse({
      type: 'place',
      details: { category: 'restaurant' },
    });
    expect(result.success).toBe(true);
  });
});

describe('coverUploadUrlSchema', () => {
  it('accepts image/png, image/jpeg and image/webp', () => {
    for (const contentType of ['image/png', 'image/jpeg', 'image/webp']) {
      expect(coverUploadUrlSchema.safeParse({ contentType }).success).toBe(true);
    }
  });

  it('rejects an unsupported content type', () => {
    expect(coverUploadUrlSchema.safeParse({ contentType: 'application/pdf' }).success).toBe(false);
  });
});

describe('extensionForCoverMimeType', () => {
  it('maps each supported content type to its file extension', () => {
    expect(extensionForCoverMimeType('image/png')).toBe('png');
    expect(extensionForCoverMimeType('image/jpeg')).toBe('jpg');
    expect(extensionForCoverMimeType('image/webp')).toBe('webp');
  });
});
