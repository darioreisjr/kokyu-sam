import { z } from 'zod';

/**
 * Fail-fast contract for the process environment. Only variables the
 * application actually reads on this phase are required — e.g.
 * SUPABASE_SECRET_KEY stays optional because no Phase 1 operation needs the
 * admin client yet.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().min(1).default('api'),
  API_VERSION: z.string().min(1).default('1'),
  APP_NAME: z.string().min(1).default('kokyu-api'),
  APP_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
  // Stays a plain validated string (never `.transform()`ed into an array)
  // — `@nestjs/config`'s `assignVariablesToProcess` only round-trips
  // primitive values back onto `process.env` after validation; an array
  // here is silently dropped, leaving `process.env.CORS_ORIGINS`
  // `undefined` at runtime regardless of the real `.env` value. Splitting
  // into an allowlist happens once, in `app.config.ts`, from this raw
  // string.
  CORS_ORIGINS: z.string().min(1),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),

  SENTRY_DSN: z.string().url().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${message}`);
  }

  return result.data;
}
