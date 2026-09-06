import { INestApplication, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { Logger } from 'nestjs-pino';
import { AppConfig } from './config/app.config';
import { isOriginAllowed } from './common/utils/cors-origin.util';

const JSON_BODY_LIMIT = '100kb';

/**
 * Shared Nest application configuration used by both the local/Docker
 * entrypoint (src/main.ts) and the Vercel serverless entrypoint
 * (api/index.ts), so the two runtimes never drift apart.
 *
 * Order matters: logger -> security headers -> CORS -> body limits ->
 * global prefix -> versioning -> (validation is per-route via Zod pipes) ->
 * global filters/guards (registered via DI in AppModule) -> Swagger.
 */
export function configureApp(app: INestApplication): void {
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService);
  const appConfig = config.get<AppConfig>('app');

  if (!appConfig) {
    throw new Error('App configuration is not available.');
  }

  app.use(helmet());

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || isOriginAllowed(origin, appConfig.corsOrigins)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
    credentials: false,
  });

  app.use(json({ limit: JSON_BODY_LIMIT }));
  app.use(urlencoded({ extended: true, limit: JSON_BODY_LIMIT }));

  app.setGlobalPrefix(appConfig.prefix);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: appConfig.version,
  });

  if (!appConfig.isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(appConfig.name)
      .setDescription('Kokyu backend API - resource server on top of Supabase Auth/Postgres')
      .setVersion(appConfig.version)
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  app.enableShutdownHooks();
}
