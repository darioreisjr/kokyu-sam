import { registerAs } from '@nestjs/config';

/**
 * Application-level auth configuration. Supabase Auth remains the identity
 * provider and source of truth for tokens, sessions and rate limits — this
 * only configures the app-side (Nest) request throttling that complements
 * (never replaces) Supabase's own protections. See docs/security.md.
 */
export const authConfig = registerAs('auth', () => ({
  throttle: {
    default: { ttlMs: 60_000, limit: 100 },
    sensitive: { ttlMs: 60_000, limit: 10 },
  },
}));

export type AuthConfig = ReturnType<typeof authConfig>;
