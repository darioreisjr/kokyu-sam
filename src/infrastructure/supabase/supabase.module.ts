import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { supabaseConfig } from '../../config/supabase.config';
import { SupabaseClientFactoryService } from './supabase-client.factory.service';

@Global()
@Module({
  imports: [ConfigModule.forFeature(supabaseConfig)],
  providers: [SupabaseClientFactoryService],
  exports: [SupabaseClientFactoryService],
})
export class SupabaseModule {}
