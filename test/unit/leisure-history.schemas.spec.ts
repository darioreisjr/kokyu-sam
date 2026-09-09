import { describe, expect, it } from 'vitest';
import {
  createLogEntrySchema,
  listHistoryQuerySchema,
} from '../../src/modules/leisure/schemas/leisure-history.schemas';

describe('createLogEntrySchema', () => {
  it('accepts a minimal valid log entry', () => {
    const result = createLogEntrySchema.safeParse({
      activityType: 'movie',
      title: 'Dune',
      completedAt: '2026-01-01T20:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid activityType', () => {
    const result = createLogEntrySchema.safeParse({
      activityType: 'painting',
      title: 'x',
      completedAt: '2026-01-01T20:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-offset completedAt datetime', () => {
    const result = createLogEntrySchema.safeParse({
      activityType: 'movie',
      title: 'x',
      completedAt: '2026-01-01T20:00:00',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a rating out of range', () => {
    const result = createLogEntrySchema.safeParse({
      activityType: 'movie',
      title: 'x',
      completedAt: '2026-01-01T20:00:00.000Z',
      rating: 6,
    });
    expect(result.success).toBe(false);
  });
});

describe('listHistoryQuerySchema', () => {
  it('coerces a numeric-string limit', () => {
    const result = listHistoryQuerySchema.safeParse({ limit: '20' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });

  it('rejects a limit above 500', () => {
    expect(listHistoryQuerySchema.safeParse({ limit: '501' }).success).toBe(false);
  });

  it('rejects an invalid leisureItemId', () => {
    expect(listHistoryQuerySchema.safeParse({ leisureItemId: 'not-a-uuid' }).success).toBe(false);
  });
});
