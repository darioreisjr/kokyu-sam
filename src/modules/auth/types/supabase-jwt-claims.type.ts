export interface SupabaseJwtClaims {
  sub?: string;
  email?: string;
  role?: string;
  aal?: string;
  session_id?: string;
  iat?: number;
  exp?: number;
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
}
