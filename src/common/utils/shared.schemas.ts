import { z } from 'zod';
import {
  isAtLeastMinimumAge,
  isFutureDateString,
  isValidCalendarDateString,
  parseISODateString,
} from './age.util';
import { isValidUsername, normalizeUsername } from './username.util';

/**
 * Reusable Zod schemas shared across modules that accept user input
 * (signup metadata, profile edits, ...), so the frontend contract and
 * every validating endpoint stay centralized and consistent.
 */

export const emailSchema = z.string().trim().toLowerCase().email();

// Normalizes to lowercase *before* validating and before it ever reaches
// persistence/comparison, so app-level and db-level (lower(username)
// unique index) checks never disagree.
export const usernameSchema = z
  .string()
  .trim()
  .transform(normalizeUsername)
  .refine(isValidUsername, {
    message:
      'Username must be 3-30 characters, start with a letter, and contain only lowercase letters, numbers, "_" or "." after that.',
  });

// Legacy datetime-coercing schema, kept for backward compatibility with any
// caller that already works with a JS Date. New profile-mutation endpoints
// use `profileBirthDateSchema` below instead, which preserves the plain
// "YYYY-MM-DD" string (no timezone conversion) all the way to Postgres.
export const birthDateSchema = z.coerce.date().refine((date) => isAtLeastMinimumAge(date), {
  message: 'You must be at least 18 years old.',
});

/**
 * Profile birthDate input: a plain "YYYY-MM-DD" calendar date (as stored
 * in Postgres `date` columns), validated for real-calendar-date-ness, not
 * in the future, and representing an age of at least 18 computed from the
 * full date (never a naive year subtraction). The output is the original
 * string, unchanged - never converted to a Date/timestamp, so no timezone
 * can shift it by a day.
 */
export const profileBirthDateSchema = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    // A single superRefine (rather than chained .refine() calls) so an
    // invalid calendar date short-circuits here - isFutureDateString/
    // isAtLeastMinimumAge both call parseISODateString, which throws for
    // a non-existent date, and chained .refine()s in Zod all run against
    // the same input regardless of an earlier one failing.
    if (!isValidCalendarDateString(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Birth date must be a valid YYYY-MM-DD date.',
      });
      return;
    }
    if (isFutureDateString(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Birth date cannot be in the future.' });
      return;
    }
    if (!isAtLeastMinimumAge(parseISODateString(value))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'You must be at least 18 years old.' });
    }
  });

export const firstNameSchema = z
  .string()
  .trim()
  .min(1, 'First name is required.')
  .max(80, 'First name must be at most 80 characters.');

export const lastNameSchema = z
  .string()
  .trim()
  .min(1, 'Last name is required.')
  .max(120, 'Last name must be at most 120 characters.');

export const bioSchema = z
  .string()
  .trim()
  .max(160, 'Bio must be at most 160 characters.')
  .nullable()
  .optional();

// Deliberately simple - a 2-letter uppercase code, not a full ISO-3166
// allowlist. Good enough to keep obviously-bad input out without an
// ever-stale country list living in this repo.
export const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, 'Country code must be a 2-letter ISO code, e.g. "BR".')
  .nullable()
  .optional();

export const regionSchema = z
  .string()
  .trim()
  .max(120, 'Region must be at most 120 characters.')
  .nullable()
  .optional();

export const citySchema = z
  .string()
  .trim()
  .max(120, 'City must be at most 120 characters.')
  .nullable()
  .optional();

// Mirrors the Supabase Auth password policy configured for the project
// (see docs/security.md - Password Rules). Supabase remains the final
// authority; this exists so the frontend/backend can fail fast with the
// same rule before a request ever reaches Supabase.
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters long.')
  .regex(/[a-z]/, 'Password must contain a lowercase letter.')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
  .regex(/[0-9]/, 'Password must contain a number.')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain a special character.');
