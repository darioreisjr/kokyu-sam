import { Profile } from './profile.type';

export const PROFILES_REPOSITORY = Symbol('PROFILES_REPOSITORY');

/**
 * Persistence contract for Profiles. ProfilesService depends only on this
 * interface, never on Supabase/PostgREST directly, so the storage
 * mechanism can change without touching application logic.
 */
export interface ProfilesRepository {
  /**
   * @param userId Supabase auth user id (JWT `sub`).
   * @param accessToken The caller's access token - queries run under that
   *   user's RLS policies, never with elevated privileges.
   */
  findById: (userId: string, accessToken: string) => Promise<Profile | null>;
}
