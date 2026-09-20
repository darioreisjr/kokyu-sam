import { describe, expect, it } from 'vitest';
import {
  createPlanEntrySchema,
  listPlanQuerySchema,
  updatePlanEntrySchema,
} from '../../src/modules/leisure/schemas/leisure-plan.schemas';

const validPlanEntryTimes = { startTime: '19:00', endTime: '21:00', duration: 120 };

describe('createPlanEntrySchema', () => {
  it('accepts a minimal valid entry', () => {
    const result = createPlanEntrySchema.safeParse({
      title: 'Watch a movie',
      date: '2026-01-01',
      ...validPlanEntryTimes,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed date', () => {
    const result = createPlanEntrySchema.safeParse({
      title: 'x',
      date: '01/01/2026',
      ...validPlanEntryTimes,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed time', () => {
    const result = createPlanEntrySchema.safeParse({
      title: 'x',
      date: '2026-01-01',
      ...validPlanEntryTimes,
      startTime: '7pm',
    });
    expect(result.success).toBe(false);
  });

  it('accepts an HH:mm:ss time', () => {
    const result = createPlanEntrySchema.safeParse({
      title: 'x',
      date: '2026-01-01',
      ...validPlanEntryTimes,
      startTime: '19:00:00',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty title', () => {
    expect(
      createPlanEntrySchema.safeParse({ title: '', date: '2026-01-01', ...validPlanEntryTimes })
        .success,
    ).toBe(false);
  });

  it('rejects unknown keys (strict)', () => {
    expect(
      createPlanEntrySchema.safeParse({
        title: 'x',
        date: '2026-01-01',
        ...validPlanEntryTimes,
        extra: 1,
      }).success,
    ).toBe(false);
  });

  it('rejects a missing startTime/endTime/duration', () => {
    const result = createPlanEntrySchema.safeParse({ title: 'Watch a movie', date: '2026-01-01' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path[0]);
      expect(paths).toEqual(expect.arrayContaining(['startTime', 'endTime', 'duration']));
    }
  });

  it('rejects a null startTime/endTime/duration', () => {
    const result = createPlanEntrySchema.safeParse({
      title: 'Watch a movie',
      date: '2026-01-01',
      startTime: null,
      endTime: null,
      duration: null,
    });
    expect(result.success).toBe(false);
  });
});

describe('createPlanEntrySchema — recurrence "custom"', () => {
  const future = { date: '2099-01-01', ...validPlanEntryTimes, recurrence: 'custom' as const };

  it('accepts a custom entry with one or more future dates', () => {
    const result = createPlanEntrySchema.safeParse({
      title: 'Personalizado',
      ...future,
      customDates: ['2099-01-03', '2099-01-07'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a custom entry with no customDates at all', () => {
    const result = createPlanEntrySchema.safeParse({ title: 'Personalizado', ...future });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.path).toEqual(['customDates']);
    }
  });

  it('rejects a custom entry with an empty customDates array', () => {
    const result = createPlanEntrySchema.safeParse({
      title: 'Personalizado',
      ...future,
      customDates: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a custom entry with a past date in customDates', () => {
    const result = createPlanEntrySchema.safeParse({
      title: 'Personalizado',
      ...future,
      customDates: ['2020-01-01'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed date inside customDates', () => {
    const result = createPlanEntrySchema.safeParse({
      title: 'Personalizado',
      ...future,
      customDates: ['01/01/2099'],
    });
    expect(result.success).toBe(false);
  });

  it('does not require customDates for other recurrences', () => {
    const result = createPlanEntrySchema.safeParse({
      title: 'Diário',
      date: '2099-01-01',
      ...validPlanEntryTimes,
      recurrence: 'daily',
    });
    expect(result.success).toBe(true);
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

  it('allows a patch that sets recurrence to "custom" alongside customDates', () => {
    const result = updatePlanEntrySchema.safeParse({
      recurrence: 'custom',
      customDates: ['2099-01-03'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a patch that sets recurrence to "custom" without customDates', () => {
    const result = updatePlanEntrySchema.safeParse({ recurrence: 'custom' });
    expect(result.success).toBe(false);
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
