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

export function buildPinoConfig(app: AppConfig): Params {
  return {
    pinoHttp: {
      level: app.logLevel,
      genReqId: (req) => extractRequestId(req),
      redact: {
        paths: REDACT_PATHS,
        censor: '[REDACTED]',
      },
      transport: app.isProduction
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
