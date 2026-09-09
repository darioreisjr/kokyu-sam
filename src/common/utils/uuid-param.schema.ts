import { z } from 'zod';

/**
 * Validates a single `:id` route param as a UUID - shared by every
 * controller with a `GET/PATCH/DELETE /resource/:id` route, so an
 * obviously-malformed id (never a valid row anyway) fails fast with a 400
 * instead of reaching the repository/Supabase.
 */
export const UuidParam = z.object({ id: z.string().uuid() }).strict();
