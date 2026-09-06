import { randomUUID } from 'node:crypto';
import { IncomingMessage } from 'node:http';
import { Params } from 'nestjs-pino';
import { AppConfig } from '../../config/app.config';

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.newPassword',
  '*.accessToken',
  '*.refreshToken',
  '*.providerToken',
  '*.provider_token',
  '*.secret',
  '*.captchaToken',
  '*.SUPABASE_SECRET_KEY',
  '*.SUPABASE_PUBLISHABLE_KEY',
];

function extractRequestId(req: IncomingMessage): string {
  const header = req.headers['x-request-id'];
  const value = Array.isArray(header) ? header[0] : header;
  return value && value.length > 0 ? value : randomUUID();
}

/**
 * pino-pretty is spawned via a worker thread (pino's `transport` option),
 * which needs to resolve the module's file on disk to launch the thread.
 * That file layout doesn't survive Vercel's serverless bundling/tracing,
 * so enabling it there fails hard with "unable to determine transport
 * target for pino-pretty" - crashing every request, not just logging
 * ugly. Pretty-printing is a local-terminal convenience only; it must
 * stay off on Vercel regardless of NODE_ENV (Preview still wants
 * non-production behavior elsewhere, e.g. Swagger - see bootstrap.ts).
 */
function isRunningOnVercel(): boolean {
  return process.env.VERCEL === '1';
}

export function buildPinoConfig(app: AppConfig): Params {
  return {
    pinoHttp: {
      level: app.logLevel,
      genReqId: (req) => extractRequestId(req),
      redact: {
        paths: REDACT_PATHS,
        censor: '[REDACTED]',
      },
      transport:
        app.isProduction || isRunningOnVercel()
          ? undefined
          : {
              target: 'pino-pretty',
              options: { singleLine: true, translateTime: 'HH:MM:ss' },
            },
      customProps: (req) => {
        const request = req as IncomingMessage & { user?: { id?: string } };
        return { userId: request.user?.id };
      },
      serializers: {
        req: (req: Record<string, unknown>) => ({
          id: req['id'],
          method: req['method'],
          url: req['url'],
        }),
        res: (res: Record<string, unknown>) => ({
          statusCode: res['statusCode'],
        }),
      },
    },
  };
}
