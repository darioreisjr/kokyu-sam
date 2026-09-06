import { describe, expect, it } from 'vitest';
import { calculateAge, isAtLeastMinimumAge } from '../../src/common/utils/age.util';

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
});
