import { describe, expect, it } from 'vitest';
import { validateEnv } from '../../src/config/env.schema';

const validEnv = {
  NODE_ENV: 'development',
  PORT: '3000',
  APP_URL: 'http://localhost:3000',
  FRONTEND_URL: 'http://localhost:3001',
  CORS_ORIGINS: 'http://localhost:3001,http://localhost:3002',
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
};

describe('validateEnv', () => {
  it('accepts a valid, minimal environment and applies defaults', () => {
    const config = validateEnv(validEnv);

    expect(config.PORT).toBe(3000);
    expect(config.API_PREFIX).toBe('api');
    expect(config.CORS_ORIGINS).toBe('http://localhost:3001,http://localhost:3002');
    expect(config.SUPABASE_SECRET_KEY).toBeUndefined();
  });

  it('does not require SUPABASE_SECRET_KEY', () => {
    expect(() => validateEnv(validEnv)).not.toThrow();
  });

  it('fails fast when a required variable is missing', () => {
    const { SUPABASE_URL, ...rest } = validEnv;
    void SUPABASE_URL;

    expect(() => validateEnv(rest)).toThrow(/SUPABASE_URL/);
  });

  it('fails fast when APP_URL is not a valid URL', () => {
    expect(() => validateEnv({ ...validEnv, APP_URL: 'not-a-url' })).toThrow();
  });

  it('rejects an unknown NODE_ENV value', () => {
    expect(() => validateEnv({ ...validEnv, NODE_ENV: 'staging' })).toThrow();
  });
});
