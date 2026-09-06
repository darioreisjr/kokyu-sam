import { describe, expect, it } from 'vitest';
import { SupabaseClientFactoryService } from '../../src/infrastructure/supabase/supabase-client.factory.service';
import { SupabaseConfig } from '../../src/config/supabase.config';

function buildService(config: Partial<SupabaseConfig> = {}): SupabaseClientFactoryService {
  return new SupabaseClientFactoryService({
    url: 'http://127.0.0.1:54321',
    publishableKey: 'anon-key',
    secretKey: undefined,
    ...config,
  });
}

describe('SupabaseClientFactoryService', () => {
  it('returns the same public client instance on every call (no per-request rebuild)', () => {
    const service = buildService();

    expect(service.getPublicClient()).toBe(service.getPublicClient());
  });

  it('builds a fresh user-scoped client per call, without touching the network at construction time', () => {
    const service = buildService();

    const clientA = service.getUserScopedClient('token-a');
    const clientB = service.getUserScopedClient('token-b');

    expect(clientA).not.toBe(clientB);
  });

  it('throws when the admin client is requested without SUPABASE_SECRET_KEY configured', () => {
    const service = buildService();

    expect(() => service.getAdminClient()).toThrow(/SUPABASE_SECRET_KEY/);
  });

  it('memoizes the admin client once a secret key is configured', () => {
    const service = buildService({ secretKey: 'service-role-key' });

    expect(service.getAdminClient()).toBe(service.getAdminClient());
  });
});
