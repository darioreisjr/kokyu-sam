export const MINIMUM_AGE_YEARS = 18;

/**
 * Computes age in whole years as of `now`, correctly accounting for
 * whether the birthday has occurred yet this year (never a naive
 * `now.getFullYear() - birthDate.getFullYear()`).
 */
export function calculateAge(birthDate: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  const dayDiff = now.getDate() - birthDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age;
}

export function isAtLeastMinimumAge(
  birthDate: Date,
  now: Date = new Date(),
  minimumAge: number = MINIMUM_AGE_YEARS,
): boolean {
  return calculateAge(birthDate, now) >= minimumAge;
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses a "YYYY-MM-DD" string into a UTC midnight Date. Never uses the
 * server's local timezone (`new Date("YYYY-MM-DD")` is already UTC per
 * spec, but we go through explicit Y/M/D construction so an invalid
 * calendar date - e.g. "2024-02-30" - never silently rolls over into the
 * next month, which `new Date(...)` alone would do).
 *
 * Throws if `value` is not a syntactically/semantically valid calendar
 * date - callers should validate with `isValidCalendarDateString` first if
 * they need a non-throwing check.
 */
export function parseISODateString(value: string): Date {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Not an ISO date string (YYYY-MM-DD): ${value}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  const rolledOver =
    date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day;

  if (rolledOver) {
    throw new Error(`Not a real calendar date: ${value}`);
  }

  return date;
}

/** Non-throwing check for `parseISODateString`. */
export function isValidCalendarDateString(value: string): boolean {
  try {
    parseISODateString(value);
    return true;
  } catch {
    return false;
  }
}

/** True when `value` (a valid "YYYY-MM-DD" string) is strictly after `now`. */
export function isFutureDateString(value: string, now: Date = new Date()): boolean {
  const date = parseISODateString(value);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return date.getTime() > today.getTime();
}
