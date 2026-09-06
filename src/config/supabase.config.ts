import { registerAs } from '@nestjs/config';
import { EnvConfig } from './env.schema';

export const supabaseConfig = registerAs('supabase', () => {
  const env = process.env as unknown as EnvConfig;

  return {
    url: env.SUPABASE_URL,
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
    secretKey: env.SUPABASE_SECRET_KEY,
  };
});

export type SupabaseConfig = ReturnType<typeof supabaseConfig>;
