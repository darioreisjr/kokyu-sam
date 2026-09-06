import { ServiceUnavailableException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HealthController } from '../../src/modules/health/health.controller';

function buildController() {
  const app = { version: '1' } as ConstructorParameters<typeof HealthController>[0];
  const supabase = { url: 'http://127.0.0.1:54321' } as ConstructorParameters<
    typeof HealthController
  >[1];

  return new HealthController(app, supabase);
}

describe('HealthController', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('check() returns a minimal status payload with no env/secret details', () => {
    const controller = buildController();
    const result = controller.check();

    expect(result).toEqual({ status: 'ok', timestamp: expect.any(String), version: '1' });
  });

  it('live() returns the same minimal payload as check()', () => {
    const controller = buildController();
    expect(controller.live()).toMatchObject({ status: 'ok', version: '1' });
  });

  it('ready() returns ok when Supabase responds successfully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 }));
    const controller = buildController();

    await expect(controller.ready()).resolves.toMatchObject({ status: 'ok' });
  });

  it('ready() throws ServiceUnavailableException when Supabase is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    const controller = buildController();

    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('ready() throws ServiceUnavailableException when Supabase responds with a 5xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 500 }));
    const controller = buildController();

    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
