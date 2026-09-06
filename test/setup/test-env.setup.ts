/**
 * Runs before any e2e/integration test file is imported (via Vitest
 * `setupFiles`). AppModule's `@Module()` decorator calls
 * `ConfigModule.forRoot({ validate: validateEnv })` eagerly at import
 * time, so these defaults must exist in `process.env` *before* the test
 * file's own `import { AppModule } ...` is evaluated - setting them inside
 * the test file itself would run too late.
 */
process.env.NODE_ENV ??= 'test';
process.env.APP_URL ??= 'http://localhost:3000';
process.env.FRONTEND_URL ??= 'http://localhost:3001';
process.env.CORS_ORIGINS ??= 'http://localhost:3001';
process.env.SUPABASE_URL ??= 'http://127.0.0.1:54321';
process.env.SUPABASE_PUBLISHABLE_KEY ??= 'test-publishable-key';
