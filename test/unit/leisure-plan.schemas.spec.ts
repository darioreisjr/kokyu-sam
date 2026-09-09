import { describe, expect, it } from 'vitest';
import {
  createPlanEntrySchema,
  listPlanQuerySchema,
  updatePlanEntrySchema,
} from '../../src/modules/leisure/schemas/leisure-plan.schemas';

describe('createPlanEntrySchema', () => {
  it('accepts a minimal valid entry', () => {
    const result = createPlanEntrySchema.safeParse({ title: 'Watch a movie', date: '2026-01-01' });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed date', () => {
    const result = createPlanEntrySchema.safeParse({ title: 'x', date: '01/01/2026' });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed time', () => {
    const result = createPlanEntrySchema.safeParse({
      title: 'x',
      date: '2026-01-01',
      startTime: '7pm',
    });
    expect(result.success).toBe(false);
  });

  it('accepts an HH:mm:ss time', () => {
    const result = createPlanEntrySchema.safeParse({
      title: 'x',
      date: '2026-01-01',
      startTime: '19:00:00',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty title', () => {
    expect(createPlanEntrySchema.safeParse({ title: '', date: '2026-01-01' }).success).toBe(false);
  });

  it('rejects unknown keys (strict)', () => {
    expect(
      createPlanEntrySchema.safeParse({ title: 'x', date: '2026-01-01', extra: 1 }).success,
    ).toBe(false);
  });
});

describe('updatePlanEntrySchema', () => {
  it('allows an empty patch', () => {
    expect(updatePlanEntrySchema.safeParse({}).success).toBe(true);
  });

  it('allows a partial patch with just completed', () => {
    const result = updatePlanEntrySchema.safeParse({ completed: true });
    expect(result.success).toBe(true);
  });
});

describe('listPlanQuerySchema', () => {
  it('accepts startDate equal to endDate (single day)', () => {
    const result = listPlanQuerySchema.safeParse({
      startDate: '2026-01-01',
      endDate: '2026-01-01',
    });
    expect(result.success).toBe(true);
  });

  it('rejects startDate after endDate', () => {
    const result = listPlanQuerySchema.safeParse({
      startDate: '2026-02-01',
      endDate: '2026-01-01',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.path).toEqual(['endDate']);
    }
  });

  it('accepts startDate before endDate', () => {
    const result = listPlanQuerySchema.safeParse({
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });
    expect(result.success).toBe(true);
  });
});
