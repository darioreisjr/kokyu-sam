import { Module } from '@nestjs/common';

/**
 * Placeholder boundary for auth-adjacent application concerns that are not
 * delegated to Supabase (e.g. claim-mapping helpers, and in the future
 * captcha verification or MFA policy). Intentionally has no providers yet -
 * see docs/architecture.md for why the actual sign up/in/out flows are not
 * proxied through this module.
 */
@Module({})
export class AuthModule {}
