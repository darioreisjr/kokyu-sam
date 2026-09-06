import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from '../../config/app.config';
import { supabaseConfig } from '../../config/supabase.config';
import { HealthController } from './health.controller';

@Module({
  imports: [ConfigModule.forFeature(appConfig), ConfigModule.forFeature(supabaseConfig)],
  controllers: [HealthController],
})
export class HealthModule {}
