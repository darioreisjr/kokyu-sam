import { Profile, ProfileBootstrapPatch, ProfileMutationInput } from './profile.type';

export const PROFILES_REPOSITORY = Symbol('PROFILES_REPOSITORY');

export interface AvatarUploadTarget {
  /** Storage object path the client must upload to (e.g. "<uid>/<uuid>.png"). */
  path: string;
  /** One-time token to pair with the signed upload URL. */
  token: string;
  /** Signed URL the client PUTs the file to directly. */
  signedUrl: string;
}

/**
 * Persistence contract for Profiles. ProfilesService and the profile
 * sub-services depend only on this interface, never on Supabase/PostgREST/
 * Storage directly, so the storage mechanism can change without touching
 * application logic.
 *
 * Every method takes the caller's access token and queries/mutates
 * exclusively through a user-scoped client (RLS-constrained) or an
 * RLS-safe RPC - never the admin client.
 */
export interface ProfilesRepository {
  /**
   * @param userId Supabase auth user id (JWT `sub`).
   * @param accessToken The caller's access token - queries run under that
   *   user's RLS policies, never with elevated privileges.
   */
  findByUserId: (userId: string, accessToken: string) => Promise<Profile | null>;

  /**
   * Lightweight completion check (selects only the two columns needed),
   * used by ProfileCompleteGuard on every request so it doesn't pay for a
   * full profile row fetch just to gate access.
   */
  getOnboardingStatus: (
    userId: string,
    accessToken: string,
  ) => Promise<{ onboardingCompletedAt: string | null; onboardingVersion: number } | null>;

  /**
   * Idempotent partial fill from Auth identity metadata. `patch` must only
   * contain fields ProfileBootstrapService has already determined are safe
   * to fill (i.e. currently null) - this method does not itself decide
   * what to overwrite, it just applies the patch and stamps
   * profile_bootstrapped_at.
   */
  bootstrap: (
    userId: string,
    accessToken: string,
    patch: ProfileBootstrapPatch,
  ) => Promise<Profile>;

  /** Calls the complete_profile RPC (auth.uid()-scoped, no id parameter). */
  complete: (accessToken: string, input: ProfileMutationInput) => Promise<Profile>;

  /** Calls the update_profile RPC (auth.uid()-scoped, no id parameter). */
  update: (accessToken: string, input: ProfileMutationInput) => Promise<Profile>;

  /**
   * Format + case-insensitive uniqueness check. Never reveals ownership.
   * Uses the public (anon-capable) client, not a user-scoped one - this
   * check must work for an unauthenticated caller (GET
   * /usernames/availability is `@Public()`).
   */
  isUsernameAvailable: (username: string) => Promise<boolean>;

  setAvatar: (userId: string, accessToken: string, avatarPath: string) => Promise<Profile>;

  removeAvatar: (userId: string, accessToken: string) => Promise<Profile>;

  createAvatarUploadUrl: (
    userId: string,
    accessToken: string,
    fileExtension: string,
  ) => Promise<AvatarUploadTarget>;

  /**
   * Resolves the single `avatarUrl` the API returns, per priority: custom
   * avatar (avatar_path, resolved to a short-lived signed URL) > external
   * avatar (avatar_external_url) > null. Never stores the resolved URL.
   */
  resolveAvatarUrl: (profile: Profile, accessToken: string) => Promise<string | null>;
}
