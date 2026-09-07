export interface SupabaseJwtClaims {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  role?: string;
  aal?: string;
  session_id?: string;
  iat?: number;
  exp?: number;
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
  /**
   * User-controlled metadata (signup form fields, OAuth identity fields
   * such as given_name/family_name/picture). Never used for authorization
   * - only for profile bootstrap convenience. See AuthenticatedUser.userMetadata.
   */
  user_metadata?: Record<string, unknown>;
}
