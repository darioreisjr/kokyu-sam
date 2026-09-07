/**
 * The application's internal representation of a caller, derived
 * exclusively from a verified Supabase access token. Only properties that
 * are actually present and trustworthy in the token claims are included.
 *
 * `id` always comes from the JWT `sub` claim - never from a client-supplied
 * body/query value.
 */
export interface AuthenticatedUser {
  /** Supabase auth user id (JWT `sub`). The one true user identifier. */
  id: string;
  email: string | undefined;
  /**
   * Supabase's own `role` claim (typically "authenticated" or "anon").
   * This is NOT a business/authorization role - see docs/security.md.
   */
  role: string;
  /** Authenticator Assurance Level, e.g. "aal1" or "aal2" (MFA). */
  aal: string | undefined;
  sessionId: string | undefined;
  /** Identity provider for this session, e.g. "email" or "google". */
  provider: string;
  /** Every identity provider linked to this account, e.g. ["email", "google"]. */
  providers: string[];
  /** Whether the account's email has been confirmed. */
  emailVerified: boolean;
  /** The access token itself, kept only for building a user-scoped client. */
  accessToken: string;
  issuedAt: Date | undefined;
  expiresAt: Date | undefined;
  /**
   * Raw `user_metadata` claim - profile-adjacent data the user/identity
   * provider supplied at signup (e.g. first_name, given_name, picture).
   * Internal use only (ProfileBootstrapService) - never log this wholesale
   * and never return it directly from an endpoint; it is not
   * authorization data.
   */
  userMetadata: Record<string, unknown>;
}
