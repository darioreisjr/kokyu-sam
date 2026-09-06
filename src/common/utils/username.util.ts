const USERNAME_PATTERN = /^[a-zA-Z0-9_.]{3,30}$/;

/**
 * Canonical form used for uniqueness checks and storage-side comparisons.
 * Must match the Postgres normalization used by the unique index in
 * supabase/migrations (lower(username)) so app-level and db-level checks
 * never disagree.
 */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}
