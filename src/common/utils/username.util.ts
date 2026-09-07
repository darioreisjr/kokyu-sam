/**
 * Must start with a letter, 3-30 characters total, lowercase letters/
 * digits/"_"/"." only. Mirrored by the Postgres CHECK constraint on
 * public.profiles.username (see supabase/migrations) - keep both in sync.
 * Validation always runs against the *normalized* (trimmed, lowercased)
 * value - never against raw user input - so callers must normalize first.
 */
const USERNAME_PATTERN = /^[a-z][a-z0-9_.]{2,29}$/;

/**
 * Canonical form used for uniqueness checks and storage-side comparisons.
 * Must match the Postgres normalization used by the unique index in
 * supabase/migrations (lower(username)) so app-level and db-level checks
 * never disagree.
 */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/**
 * Validates an already-normalized (trimmed, lowercased) username. Pass raw
 * user input through `normalizeUsername()` first.
 */
export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}
