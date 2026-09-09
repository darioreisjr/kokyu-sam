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
import { ProfileCompleteGuard } from './common/auth/guards/profile-complete.guard';
import { SupabaseModule } from './infrastructure/supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { HealthModule } from './modules/health/health.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { LeisureModule } from './modules/leisure/leisure.module';

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
    FeatureFlagsModule,
    LeisureModule,
  ],
  providers: [
    // Registration order matters for APP_GUARD: Throttler -> SupabaseAuth
    // (attaches request.user) -> ProfileComplete (needs request.user).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SupabaseAuthGuard },
    { provide: APP_GUARD, useClass: ProfileCompleteGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
