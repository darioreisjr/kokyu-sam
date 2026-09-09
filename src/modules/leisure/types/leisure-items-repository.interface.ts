import {
  LeisureItem,
  LeisureItemCreateInput,
  LeisureItemListFilter,
  LeisureItemUpdateInput,
} from './leisure-item.type';

export const LEISURE_ITEMS_REPOSITORY = Symbol('LEISURE_ITEMS_REPOSITORY');

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
}
