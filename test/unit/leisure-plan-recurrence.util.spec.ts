import { describe, expect, it } from 'vitest';
import {
  expandPlanEntriesForRange,
  occurrenceCompletionKey,
} from '../../src/modules/leisure/leisure-plan-recurrence.util';
import { LeisurePlanEntry } from '../../src/modules/leisure/types/leisure-plan-entry.type';

function buildEntry(overrides: Partial<LeisurePlanEntry> = {}): LeisurePlanEntry {
  return {
    id: 'plan-1',
    userId: 'user-1',
    leisureItemId: null,
    title: 'Alongar',
    date: '2026-01-01',
    occurrenceDate: '2026-01-01',
    startTime: null,
    endTime: null,
    duration: null,
    recurrence: 'none',
    notes: null,
    reminder: false,
    completed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    archived: false,
    archivedAt: null,
    ...overrides,
  };
}

describe('occurrenceCompletionKey', () => {
  it('joins the plan entry id and occurrence date', () => {
    expect(occurrenceCompletionKey('plan-1', '2026-01-05')).toBe('plan-1|2026-01-05');
  });
});

describe('expandPlanEntriesForRange — none/custom', () => {
  it('keeps a "none" entry as a single occurrence when its date is within range', () => {
    const entry = buildEntry({ date: '2026-01-05' });
    const result = expandPlanEntriesForRange([entry], '2026-01-01', '2026-01-10', new Set());

    expect(result).toEqual([{ ...entry, occurrenceDate: '2026-01-05' }]);
  });

  it('drops a "none" entry whose date falls outside the range', () => {
    const entry = buildEntry({ date: '2025-12-25' });
    const result = expandPlanEntriesForRange([entry], '2026-01-01', '2026-01-10', new Set());

    expect(result).toEqual([]);
  });

  it('treats "custom" the same as "none" (no interval captured to expand from)', () => {
    const entry = buildEntry({ date: '2026-01-05', recurrence: 'custom' });
    const result = expandPlanEntriesForRange([entry], '2026-01-01', '2026-01-10', new Set());

    expect(result).toHaveLength(1);
    expect(result[0]!.occurrenceDate).toBe('2026-01-05');
  });

  it('respects a "none" entry\'s own completed column', () => {
    const entry = buildEntry({ date: '2026-01-05', completed: true });
    const result = expandPlanEntriesForRange([entry], '2026-01-01', '2026-01-10', new Set());

    expect(result[0]!.completed).toBe(true);
  });
});

describe('expandPlanEntriesForRange — daily', () => {
  it('appears on every day from its anchor date through the end of the range', () => {
    const entry = buildEntry({ date: '2026-01-03', recurrence: 'daily' });
    const result = expandPlanEntriesForRange([entry], '2026-01-01', '2026-01-06', new Set());

    expect(result.map((e) => e.occurrenceDate)).toEqual([
      '2026-01-03',
      '2026-01-04',
      '2026-01-05',
      '2026-01-06',
    ]);
  });

  it('starts at the range start when the anchor is before it (created a while ago)', () => {
    const entry = buildEntry({ date: '2020-01-01', recurrence: 'daily' });
    const result = expandPlanEntriesForRange([entry], '2026-01-01', '2026-01-03', new Set());

    expect(result.map((e) => e.occurrenceDate)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
  });

  it('never appears before its anchor date, even within the range', () => {
    const entry = buildEntry({ date: '2026-01-05', recurrence: 'daily' });
    const result = expandPlanEntriesForRange([entry], '2026-01-01', '2026-01-10', new Set());

    expect(result.map((e) => e.occurrenceDate)).toEqual([
      '2026-01-05',
      '2026-01-06',
      '2026-01-07',
      '2026-01-08',
      '2026-01-09',
      '2026-01-10',
    ]);
  });

  it('produces no occurrences when the anchor is after the range', () => {
    const entry = buildEntry({ date: '2026-02-01', recurrence: 'daily' });
    const result = expandPlanEntriesForRange([entry], '2026-01-01', '2026-01-10', new Set());

    expect(result).toEqual([]);
  });

  it('every occurrence keeps `date` as the anchor, not the occurrence day', () => {
    const entry = buildEntry({ date: '2026-01-01', recurrence: 'daily' });
    const result = expandPlanEntriesForRange([entry], '2026-01-01', '2026-01-03', new Set());

    expect(result.every((e) => e.date === '2026-01-01')).toBe(true);
    expect(result.map((e) => e.occurrenceDate)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
  });

  it('reflects completion per occurrence date, independent of other days', () => {
    const entry = buildEntry({ id: 'plan-9', date: '2026-01-01', recurrence: 'daily' });
    const completed = new Set([occurrenceCompletionKey('plan-9', '2026-01-02')]);
    const result = expandPlanEntriesForRange([entry], '2026-01-01', '2026-01-03', completed);

    expect(result.map((e) => e.completed)).toEqual([false, true, false]);
  });
});

describe('expandPlanEntriesForRange — weekly', () => {
  it('recurs every 7 days from the anchor', () => {
    const entry = buildEntry({ date: '2026-01-01', recurrence: 'weekly' });
    const result = expandPlanEntriesForRange([entry], '2026-01-01', '2026-01-31', new Set());

    expect(result.map((e) => e.occurrenceDate)).toEqual([
      '2026-01-01',
      '2026-01-08',
      '2026-01-15',
      '2026-01-22',
      '2026-01-29',
    ]);
  });

  it('aligns to the anchor weekday even when the range starts mid-cycle', () => {
    // Anchor is a Thursday (2026-01-01); the range below starts on a
    // Sunday, so the first in-range occurrence must still land on the
    // next Thursday (2026-01-08), not on the range's own start date.
    const entry = buildEntry({ date: '2026-01-01', recurrence: 'weekly' });
    const result = expandPlanEntriesForRange([entry], '2026-01-04', '2026-01-20', new Set());

    expect(result.map((e) => e.occurrenceDate)).toEqual(['2026-01-08', '2026-01-15']);
  });

  it('produces no occurrences when the range falls entirely between two weekly dates', () => {
    const entry = buildEntry({ date: '2026-01-01', recurrence: 'weekly' });
    const result = expandPlanEntriesForRange([entry], '2026-01-02', '2026-01-07', new Set());

    expect(result).toEqual([]);
  });
});

describe('expandPlanEntriesForRange — multiple entries', () => {
  it('expands each entry independently and preserves relative order', () => {
    const daily = buildEntry({ id: 'daily-1', date: '2026-01-01', recurrence: 'daily' });
    const single = buildEntry({ id: 'single-1', date: '2026-01-02' });
    const result = expandPlanEntriesForRange(
      [daily, single],
      '2026-01-01',
      '2026-01-02',
      new Set(),
    );

    expect(result.map((e) => [e.id, e.occurrenceDate])).toEqual([
      ['daily-1', '2026-01-01'],
      ['daily-1', '2026-01-02'],
      ['single-1', '2026-01-02'],
    ]);
  });
});
