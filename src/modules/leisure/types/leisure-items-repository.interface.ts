import {
  LeisureItem,
  LeisureItemCreateInput,
  LeisureItemListFilter,
  LeisureItemUpdateInput,
} from './leisure-item.type';

export const LEISURE_ITEMS_REPOSITORY = Symbol('LEISURE_ITEMS_REPOSITORY');

export interface LeisureCoverUploadTarget {
  /** Storage object path the client must upload to (e.g. "<uid>/<uuid>.png"). */
  path: string;
  /** One-time token to pair with the signed upload URL. */
  token: string;
  /** Signed URL the client PUTs the file to directly. */
  signedUrl: string;
}

/**
 * Persistence contract for leisure_items. Every method takes the caller's
 * access token and queries exclusively through a user-scoped client
 * (RLS-constrained) - never the admin client. No method takes a userId
 * parameter for filtering: RLS is what actually scopes every query, the
 * same defense-in-depth posture as ProfilesRepository.
 */
export interface LeisureItemsRepository {
  findAll: (accessToken: string, filter: LeisureItemListFilter) => Promise<LeisureItem[]>;
  findById: (accessToken: string, id: string) => Promise<LeisureItem | null>;
  create: (
    accessToken: string,
    userId: string,
    input: LeisureItemCreateInput,
  ) => Promise<LeisureItem>;
  update: (
    accessToken: string,
    id: string,
    patch: LeisureItemUpdateInput,
  ) => Promise<LeisureItem | null>;
  delete: (accessToken: string, id: string) => Promise<void>;

  /**
   * Signed upload URL for a cover image, scoped to the caller's own
   * "<uid>/" folder in the public "leisure-covers" bucket (see
   * supabase/migrations/20260103000000_leisure_covers_storage.sql).
   * Unlike avatars there is no confirm step: the bucket is public, so the
   * client resolves the final `coverImage` URL itself via
   * `getPublicUrl(path)` (a local, no-network computation) and sends it
   * like any other field on the next create/update PATCH.
   */
  createCoverUploadUrl: (
    accessToken: string,
    userId: string,
    fileExtension: string,
  ) => Promise<LeisureCoverUploadTarget>;
}
