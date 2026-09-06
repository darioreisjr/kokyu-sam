import { z } from 'zod';
import { isAtLeastMinimumAge } from './age.util';
import { isValidUsername } from './username.util';

/**
 * Reusable Zod schemas shared by future modules that accept user input
 * (signup metadata, profile edits, ...). Not wired to a live mutating
 * endpoint yet in Phase 1, but kept here so the frontend contract and any
 * future validation stay centralized and consistent.
 */

export const emailSchema = z.string().trim().toLowerCase().email();

export const usernameSchema = z.string().trim().refine(isValidUsername, {
  message: 'Username must be 3-30 characters: letters, numbers, "_" or "." only.',
});

export const birthDateSchema = z.coerce.date().refine((date) => isAtLeastMinimumAge(date), {
  message: 'You must be at least 18 years old.',
});

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
