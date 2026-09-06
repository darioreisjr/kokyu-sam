import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { appConfig } from './config/app.config';
import { authConfig } from './config/auth.config';
import { supabaseConfig } from './config/supabase.config';
import { validateEnv } from './config/env.schema';
import { buildPinoConfig } from './common/logger/pino.config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { SupabaseAuthGuard } from './common/auth/guards/supabase-auth.guard';
import { SupabaseModule } from './infrastructure/supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [appConfig, authConfig, supabaseConfig],
    }),
    LoggerModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (app: ConfigType<typeof appConfig>) => buildPinoConfig(app),
    }),
    ThrottlerModule.forRootAsync({
      inject: [authConfig.KEY],
      useFactory: (auth: ConfigType<typeof authConfig>) => ({
        throttlers: [
          {
            ttl: auth.throttle.default.ttlMs,
            limit: auth.throttle.default.limit,
          },
        ],
      }),
    }),
    SupabaseModule,
    AuthModule,
    ProfilesModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SupabaseAuthGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
