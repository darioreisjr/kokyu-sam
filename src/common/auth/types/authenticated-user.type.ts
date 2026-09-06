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
  /** The access token itself, kept only for building a user-scoped client. */
  accessToken: string;
  issuedAt: Date | undefined;
  expiresAt: Date | undefined;
}
