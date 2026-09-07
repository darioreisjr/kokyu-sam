/**
 * Domain representation of a row in public.profiles, decoupled from the
 * Supabase-generated (snake_case) row shape. Controllers/services never
 * see the raw database row directly - see docs/architecture.md
 * ("Data mapping").
 *
 * `onboardingComplete` (boolean) from Phase 1 is gone: completion is now a
 * derived value (see ProfileCompletionService), computed from
 * `onboardingCompletedAt` + `onboardingVersion` rather than stored as a
 * single source of truth.
 */
export interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  birthDate: string | null;
  bio: string | null;
  /** Storage object path (e.g. "<uid>/<file>"), never a URL. Resolved to a signed URL at read time. */
  avatarPath: string | null;
  /** Avatar URL sourced from an identity provider (e.g. Google picture). Used only when avatarPath is null. */
  avatarExternalUrl: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  onboardingCompletedAt: string | null;
  onboardingVersion: number;
  profileBootstrappedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Fields ProfileBootstrapService may fill in from Auth identity metadata. */
export interface ProfileBootstrapPatch {
  firstName?: string;
  lastName?: string;
  username?: string;
  birthDate?: string;
  avatarExternalUrl?: string;
}

/** Fields accepted by the complete_profile / update_profile RPCs. */
export interface ProfileMutationInput {
  firstName: string;
  lastName: string;
  username: string;
  birthDate: string;
  bio: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
}
