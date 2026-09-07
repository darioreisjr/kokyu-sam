/**
 * Bumped whenever the set (or meaning) of fields required for onboarding
 * changes. A profile is only considered "complete" when
 * `onboarding_version >= CURRENT_PROFILE_ONBOARDING_VERSION` AND
 * `onboarding_completed_at IS NOT NULL` - see ProfileCompletionService.
 *
 * Bumping this constant alone is enough to force every existing user back
 * through onboarding (their stored onboarding_version will fall behind),
 * without needing a data migration.
 */
export const CURRENT_PROFILE_ONBOARDING_VERSION = 1;
