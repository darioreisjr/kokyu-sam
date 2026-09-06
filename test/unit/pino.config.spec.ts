import { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it } from 'vitest';
import { buildPinoConfig } from '../../src/common/logger/pino.config';
import { AppConfig } from '../../src/config/app.config';

/**
 * `Params['pinoHttp']` is typed as a union (Options | DestinationStream |
 * [Options, DestinationStream]) because pino-http accepts all three at
 * runtime. Our own buildPinoConfig only ever produces a plain options
 * object, so tests narrow to that shape once here instead of asserting on
 * every access.
 */
interface PinoHttpOptions {
  redact?: { paths: string[] };
  transport?: unknown;
  genReqId?: (req: IncomingMessage, res: ServerResponse) => string;
  customProps?: (req: IncomingMessage, res: ServerResponse) => Record<string, unknown>;
}

function getPinoHttpOptions(config: AppConfig): PinoHttpOptions {
  return buildPinoConfig(config).pinoHttp as PinoHttpOptions;
}

function buildAppConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    nodeEnv: 'development',
    port: 3000,
    prefix: 'api',
    version: '1',
    name: 'kokyu-api',
    url: 'http://localhost:3000',
    frontendUrl: 'http://localhost:3001',
    corsOrigins: ['http://localhost:3001'],
    logLevel: 'info',
    isProduction: false,
    ...overrides,
  };
}

describe('buildPinoConfig', () => {
  it('redacts every sensitive field required by docs/security.md', () => {
    const pinoHttp = getPinoHttpOptions(buildAppConfig());

    expect(pinoHttp.redact?.paths).toEqual(
      expect.arrayContaining([
        'req.headers.authorization',
        'req.headers.cookie',
        '*.password',
        '*.newPassword',
        '*.accessToken',
        '*.refreshToken',
        '*.providerToken',
        '*.secret',
        '*.captchaToken',
      ]),
    );
  });

  it('enables pino-pretty transport outside of production', () => {
    const pinoHttp = getPinoHttpOptions(buildAppConfig({ isProduction: false }));
    expect(pinoHttp.transport).toBeDefined();
  });

  it('disables pino-pretty transport in production (JSON logs)', () => {
    const pinoHttp = getPinoHttpOptions(buildAppConfig({ isProduction: true }));
    expect(pinoHttp.transport).toBeUndefined();
  });

  it('reuses a trusted X-Request-Id header instead of generating a new id', () => {
    const pinoHttp = getPinoHttpOptions(buildAppConfig());
    const req = { headers: { 'x-request-id': 'incoming-id-123' } } as unknown as IncomingMessage;

    expect(pinoHttp.genReqId?.(req, {} as unknown as ServerResponse)).toBe('incoming-id-123');
  });

  it('generates a new id when no X-Request-Id header is present', () => {
    const pinoHttp = getPinoHttpOptions(buildAppConfig());
    const req = { headers: {} } as unknown as IncomingMessage;

    const id = pinoHttp.genReqId?.(req, {} as unknown as ServerResponse);
    expect(typeof id).toBe('string');
    expect((id as string).length).toBeGreaterThan(0);
  });

  it('includes the authenticated user id (when present) as a custom log property', () => {
    const pinoHttp = getPinoHttpOptions(buildAppConfig());
    const req = { user: { id: 'user-1' } } as unknown as IncomingMessage;

    expect(pinoHttp.customProps?.(req, {} as unknown as ServerResponse)).toEqual({
      userId: 'user-1',
    });
  });
});
