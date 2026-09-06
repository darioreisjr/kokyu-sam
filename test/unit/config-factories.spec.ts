import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { appConfig } from '../../src/config/app.config';
import { authConfig } from '../../src/config/auth.config';
import { supabaseConfig } from '../../src/config/supabase.config';

describe('appConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.PORT = '4000';
    process.env.API_PREFIX = 'api';
    process.env.API_VERSION = '1';
    process.env.APP_NAME = 'kokyu-api';
    process.env.APP_URL = 'https://api.kokyu.app';
    process.env.FRONTEND_URL = 'https://kokyu.app';
    process.env.CORS_ORIGINS = 'https://kokyu.app,https://staging.kokyu.app';
    process.env.LOG_LEVEL = 'info';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('reads and normalizes app-level configuration from process.env', () => {
    const config = appConfig();

    expect(config).toEqual({
      nodeEnv: 'production',
      port: 4000,
      prefix: 'api',
      version: '1',
      name: 'kokyu-api',
      url: 'https://api.kokyu.app',
      frontendUrl: 'https://kokyu.app',
      corsOrigins: ['https://kokyu.app', 'https://staging.kokyu.app'],
      logLevel: 'info',
      isProduction: true,
    });
  });

  it('flags isProduction=false outside of production', () => {
    process.env.NODE_ENV = 'development';
    expect(appConfig().isProduction).toBe(false);
  });
});

describe('supabaseConfig', () => {
  it('reads Supabase connection settings from process.env', () => {
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'anon-key';
    delete process.env.SUPABASE_SECRET_KEY;

    expect(supabaseConfig()).toEqual({
      url: 'http://127.0.0.1:54321',
      publishableKey: 'anon-key',
      secretKey: undefined,
    });
  });
});

describe('authConfig', () => {
  it('provides Nest-side throttle defaults that complement (never replace) Supabase rate limits', () => {
    const config = authConfig();

    expect(config.throttle.default.limit).toBeGreaterThan(config.throttle.sensitive.limit);
  });
});
