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
