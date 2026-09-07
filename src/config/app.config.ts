import { registerAs } from '@nestjs/config';
import { EnvConfig } from './env.schema';

export const appConfig = registerAs('app', () => {
  const env = process.env as unknown as EnvConfig;

  return {
    nodeEnv: env.NODE_ENV,
    port: Number(env.PORT),
    prefix: env.API_PREFIX,
    version: env.API_VERSION,
    name: env.APP_NAME,
    url: env.APP_URL,
    frontendUrl: env.FRONTEND_URL,
    corsOrigins: String(env.CORS_ORIGINS)
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    logLevel: env.LOG_LEVEL,
    isProduction: env.NODE_ENV === 'production',
  };
});

export type AppConfig = ReturnType<typeof appConfig>;
