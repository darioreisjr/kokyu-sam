import { describe, expect, it } from 'vitest';
import {
  addCollectionItemSchema,
  createCollectionSchema,
  removeCollectionItemParamsSchema,
  updateCollectionSchema,
} from '../../src/modules/leisure/schemas/leisure-collection.schemas';

describe('createCollectionSchema', () => {
  it('accepts a minimal valid collection', () => {
    expect(createCollectionSchema.safeParse({ name: 'Weekend picks' }).success).toBe(true);
  });

  it('accepts optional itemIds as uuids', () => {
    const result = createCollectionSchema.safeParse({
      name: 'Weekend picks',
      itemIds: ['11111111-1111-1111-1111-111111111111'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-uuid itemId', () => {
    const result = createCollectionSchema.safeParse({
      name: 'Weekend picks',
      itemIds: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty name', () => {
    expect(createCollectionSchema.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('updateCollectionSchema', () => {
  it('does not accept itemIds (managed via /items)', () => {
    const result = updateCollectionSchema.safeParse({
      name: 'Renamed',
      itemIds: ['11111111-1111-1111-1111-111111111111'],
    });
    expect(result.success).toBe(false);
  });

  it('allows an empty patch', () => {
    expect(updateCollectionSchema.safeParse({}).success).toBe(true);
  });
});

describe('addCollectionItemSchema', () => {
  it('requires a uuid itemId', () => {
    expect(
      addCollectionItemSchema.safeParse({ itemId: '11111111-1111-1111-1111-111111111111' }).success,
    ).toBe(true);
    expect(addCollectionItemSchema.safeParse({ itemId: 'not-a-uuid' }).success).toBe(false);
  });
});

describe('removeCollectionItemParamsSchema', () => {
  it('requires both id and itemId to be uuids', () => {
    const result = removeCollectionItemParamsSchema.safeParse({
      id: '11111111-1111-1111-1111-111111111111',
      itemId: '22222222-2222-2222-2222-222222222222',
    });
    expect(result.success).toBe(true);
  });
});
