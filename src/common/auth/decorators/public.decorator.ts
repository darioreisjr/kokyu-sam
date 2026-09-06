import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route (or an entire controller) as not requiring authentication.
 * The global SupabaseAuthGuard treats every route as private by default -
 * this is the only opt-out, so it must be applied explicitly and
 * deliberately for each public endpoint.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
