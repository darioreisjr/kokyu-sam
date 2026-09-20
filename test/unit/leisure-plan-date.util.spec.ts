import { describe, expect, it } from 'vitest';
import {
  findPastPlanEntryViolation,
  isTodayKey,
  withCustomDatesAnchor,
} from '../../src/modules/leisure/leisure-plan-date.util';

const NOW = new Date('2026-06-15T14:30:00.000Z');

describe('findPastPlanEntryViolation — create (no reference)', () => {
  it('accepts a future date', () => {
    expect(findPastPlanEntryViolation({ date: '2026-06-16' }, undefined, NOW)).toBeNull();
  });

  it('accepts today with no time set', () => {
    expect(findPastPlanEntryViolation({ date: '2026-06-15' }, undefined, NOW)).toBeNull();
  });

  it('rejects a past date', () => {
    const violation = findPastPlanEntryViolation({ date: '2026-06-14' }, undefined, NOW);
    expect(violation?.field).toBe('date');
  });

  it('accepts today with a startTime later than now', () => {
    const violation = findPastPlanEntryViolation(
      { date: '2026-06-15', startTime: '15:00' },
      undefined,
      NOW,
    );
    expect(violation).toBeNull();
  });

  it('rejects today with a startTime earlier than now', () => {
    const violation = findPastPlanEntryViolation(
      { date: '2026-06-15', startTime: '14:00' },
      undefined,
      NOW,
    );
    expect(violation?.field).toBe('startTime');
  });

  it('rejects today with an endTime earlier than now', () => {
    const violation = findPastPlanEntryViolation(
      { date: '2026-06-15', startTime: '13:00', endTime: '14:00' },
      undefined,
      NOW,
    );
    // startTime is also in the past here, but the check runs date -> startTime -> endTime
    // and returns the first violation found.
    expect(violation?.field).toBe('startTime');
  });

  it('rejects a future date with a lone past endTime (startTime absent)', () => {
    const violation = findPastPlanEntryViolation(
      { date: '2026-06-15', endTime: '14:00' },
      undefined,
      NOW,
    );
    expect(violation?.field).toBe('endTime');
  });

  it('accepts an HH:mm:ss time at/after now', () => {
    expect(
      findPastPlanEntryViolation({ date: '2026-06-15', startTime: '14:30:00' }, undefined, NOW),
    ).toBeNull();
  });

  it('does not check time fields for a future date', () => {
    expect(
      findPastPlanEntryViolation(
        { date: '2026-06-16', startTime: '00:00', endTime: '00:01' },
        undefined,
        NOW,
      ),
    ).toBeNull();
  });
});

describe('findPastPlanEntryViolation — update (with reference)', () => {
  it('allows keeping an already-past date/time unchanged', () => {
    const reference = { date: '2020-01-01', startTime: '10:00', endTime: '11:00' };
    const violation = findPastPlanEntryViolation(
      { date: '2020-01-01', startTime: '10:00', endTime: '11:00' },
      reference,
      NOW,
    );
    expect(violation).toBeNull();
  });

  it('allows a patch that never touches date/startTime/endTime', () => {
    const reference = { date: '2020-01-01', startTime: '10:00', endTime: '11:00' };
    expect(findPastPlanEntryViolation({}, reference, NOW)).toBeNull();
  });

  it('rejects changing an already-past date to a different past date', () => {
    const reference = { date: '2020-01-01', startTime: null, endTime: null };
    const violation = findPastPlanEntryViolation({ date: '2020-06-01' }, reference, NOW);
    expect(violation?.field).toBe('date');
  });

  it('rejects moving the date forward into the past relative to today', () => {
    const reference = { date: '2026-06-20' };
    const violation = findPastPlanEntryViolation({ date: '2026-06-01' }, reference, NOW);
    expect(violation?.field).toBe('date');
  });

  it('accepts rescheduling to a future date', () => {
    const reference = { date: '2020-01-01' };
    expect(findPastPlanEntryViolation({ date: '2026-06-20' }, reference, NOW)).toBeNull();
  });

  it('rejects setting a new startTime earlier than now when the (unchanged) date is today', () => {
    const reference = { date: '2026-06-15', startTime: '18:00' };
    const violation = findPastPlanEntryViolation(
      { date: '2026-06-15', startTime: '10:00' },
      reference,
      NOW,
    );
    expect(violation?.field).toBe('startTime');
  });

  it('allows an unchanged already-past startTime on today when only the title would change', () => {
    const reference = { date: '2026-06-15', startTime: '10:00' };
    const violation = findPastPlanEntryViolation(
      { date: '2026-06-15', startTime: '10:00' },
      reference,
      NOW,
    );
    expect(violation).toBeNull();
  });

  it('re-validates startTime against now when the date itself changes to today', () => {
    const reference = { date: '2026-06-20', startTime: '10:00' };
    const violation = findPastPlanEntryViolation(
      { date: '2026-06-15', startTime: '10:00' },
      reference,
      NOW,
    );
    expect(violation?.field).toBe('startTime');
  });
});

describe('findPastPlanEntryViolation — customDates', () => {
  it('accepts a create with only future customDates', () => {
    expect(
      findPastPlanEntryViolation(
        { date: '2026-06-16', customDates: ['2026-06-16', '2026-06-20'] },
        undefined,
        NOW,
      ),
    ).toBeNull();
  });

  it('rejects a create with a past date among customDates', () => {
    const violation = findPastPlanEntryViolation(
      { date: '2026-06-16', customDates: ['2026-06-16', '2026-06-01'] },
      undefined,
      NOW,
    );
    expect(violation?.field).toBe('customDates');
  });

  it('allows keeping an already-past customDate unchanged on update', () => {
    const reference = { date: '2020-01-01', customDates: ['2020-01-01'] };
    const violation = findPastPlanEntryViolation({ customDates: ['2020-01-01'] }, reference, NOW);
    expect(violation).toBeNull();
  });

  it('rejects adding a new past customDate on update, even alongside an unchanged past one', () => {
    const reference = { date: '2020-01-01', customDates: ['2020-01-01'] };
    const violation = findPastPlanEntryViolation(
      { customDates: ['2020-01-01', '2020-02-01'] },
      reference,
      NOW,
    );
    expect(violation?.field).toBe('customDates');
  });

  it('accepts adding a new future customDate on update', () => {
    const reference = { date: '2020-01-01', customDates: ['2020-01-01'] };
    const violation = findPastPlanEntryViolation(
      { customDates: ['2020-01-01', '2026-07-01'] },
      reference,
      NOW,
    );
    expect(violation).toBeNull();
  });
});

describe('withCustomDatesAnchor', () => {
  it('sets `date` to the earliest customDates entry for a "custom" recurrence', () => {
    const result = withCustomDatesAnchor({
      recurrence: 'custom',
      customDates: ['2026-06-20', '2026-06-05', '2026-06-15'],
      date: '2026-06-20',
    });
    expect(result.date).toBe('2026-06-05');
  });

  it('leaves `date` untouched for a non-"custom" recurrence', () => {
    const result = withCustomDatesAnchor({
      recurrence: 'daily',
      customDates: ['2026-06-20'],
      date: '2026-06-01',
    });
    expect(result.date).toBe('2026-06-01');
  });

  it('leaves the input untouched when customDates is absent or empty', () => {
    expect(withCustomDatesAnchor({ recurrence: 'custom', date: '2026-06-01' }).date).toBe(
      '2026-06-01',
    );
    expect(
      withCustomDatesAnchor({ recurrence: 'custom', customDates: [], date: '2026-06-01' }).date,
    ).toBe('2026-06-01');
  });

  it('falls back to the provided recurrence when the input omits it (PATCH case)', () => {
    const result = withCustomDatesAnchor(
      { customDates: ['2026-06-20', '2026-06-05'], date: '2026-06-20' },
      'custom',
    );
    expect(result.date).toBe('2026-06-05');
  });
});

describe('isTodayKey', () => {
  it("returns true for the server's current UTC date", () => {
    expect(isTodayKey('2026-06-15', NOW)).toBe(true);
  });

  it('returns false for a past date', () => {
    expect(isTodayKey('2026-06-14', NOW)).toBe(false);
  });

  it('returns false for a future date', () => {
    expect(isTodayKey('2026-06-16', NOW)).toBe(false);
  });
});
