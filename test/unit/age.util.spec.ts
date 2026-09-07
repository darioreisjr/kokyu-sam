import { describe, expect, it } from 'vitest';
import {
  calculateAge,
  isAtLeastMinimumAge,
  isFutureDateString,
  isValidCalendarDateString,
  parseISODateString,
} from '../../src/common/utils/age.util';

describe('calculateAge', () => {
  it('counts a birthday that already happened this year', () => {
    expect(calculateAge(new Date('2000-01-01'), new Date('2026-06-01'))).toBe(26);
  });

  it('does not count a birthday that has not happened yet this year', () => {
    expect(calculateAge(new Date('2000-12-31'), new Date('2026-06-01'))).toBe(25);
  });

  it('handles the birthday falling exactly today', () => {
    expect(calculateAge(new Date('2000-06-01'), new Date('2026-06-01'))).toBe(26);
  });

  it('handles a birthday one day away from today (month boundary)', () => {
    expect(calculateAge(new Date('2000-06-02'), new Date('2026-06-01'))).toBe(25);
  });
});

describe('isAtLeastMinimumAge', () => {
  it('returns true for someone who just turned 18 today', () => {
    expect(isAtLeastMinimumAge(new Date('2008-06-01'), new Date('2026-06-01'))).toBe(true);
  });

  it('returns false for someone turning 18 tomorrow', () => {
    expect(isAtLeastMinimumAge(new Date('2008-06-02'), new Date('2026-06-01'))).toBe(false);
  });

  it('handles a leap-year birth date (Feb 29) correctly once the person turns 18', () => {
    expect(isAtLeastMinimumAge(new Date('2008-02-29'), new Date('2026-03-01'))).toBe(true);
  });
});

describe('parseISODateString', () => {
  it('parses a valid "YYYY-MM-DD" string to UTC midnight', () => {
    const date = parseISODateString('1990-01-01');
    expect(date.getUTCFullYear()).toBe(1990);
    expect(date.getUTCMonth()).toBe(0);
    expect(date.getUTCDate()).toBe(1);
  });

  it('throws on a syntactically invalid string', () => {
    expect(() => parseISODateString('01/01/1990')).toThrow();
  });

  it('throws on a calendar date that does not exist (Feb 30) instead of silently rolling over', () => {
    expect(() => parseISODateString('2024-02-30')).toThrow();
  });

  it('accepts a real leap day', () => {
    expect(() => parseISODateString('2024-02-29')).not.toThrow();
  });

  it('rejects Feb 29 on a non-leap year', () => {
    expect(() => parseISODateString('2023-02-29')).toThrow();
  });
});

describe('isValidCalendarDateString', () => {
  it('true for a real date, false for a malformed/non-existent one', () => {
    expect(isValidCalendarDateString('1990-01-01')).toBe(true);
    expect(isValidCalendarDateString('2024-02-30')).toBe(false);
    expect(isValidCalendarDateString('not-a-date')).toBe(false);
  });
});

describe('isFutureDateString', () => {
  it('true for a date strictly after "now"', () => {
    expect(isFutureDateString('2027-01-01', new Date('2026-06-01T00:00:00.000Z'))).toBe(true);
  });

  it('false for today and for the past', () => {
    expect(isFutureDateString('2026-06-01', new Date('2026-06-01T12:00:00.000Z'))).toBe(false);
    expect(isFutureDateString('2020-01-01', new Date('2026-06-01T00:00:00.000Z'))).toBe(false);
  });
});
