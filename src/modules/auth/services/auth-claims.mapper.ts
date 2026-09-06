import { AuthenticatedUser } from '../../../common/auth/types/authenticated-user.type';
import { SupabaseJwtClaims } from '../types/supabase-jwt-claims.type';

/**
 * Pure mapping from verified Supabase JWT claims to the application's
 * AuthenticatedUser. Kept separate from SupabaseAuthGuard so the mapping
 * rules can be unit tested without spinning up the guard/HTTP context.
 *
 * `role` here is Supabase's own claim (typically "authenticated") and must
 * never be treated as a business authorization role - see docs/security.md.
 */
export function mapClaimsToAuthenticatedUser(
  claims: SupabaseJwtClaims,
  accessToken: string,
): AuthenticatedUser {
  if (!claims.sub) {
    throw new Error('Cannot map claims without a subject (sub).');
  }

  return {
    id: claims.sub,
    email: claims.email,
    role: claims.role ?? 'authenticated',
    aal: claims.aal,
    sessionId: claims.session_id,
    provider: extractProvider(claims),
    accessToken,
    issuedAt: claims.iat ? new Date(claims.iat * 1000) : undefined,
    expiresAt: claims.exp ? new Date(claims.exp * 1000) : undefined,
  };
}

/**
 * The identity provider that authenticated this session (e.g. "email",
 * "google"), derived from trusted app_metadata claims rather than
 * user-controlled user_metadata.
 */
export function extractProvider(claims: SupabaseJwtClaims): string {
  return claims.app_metadata?.provider ?? 'email';
}
