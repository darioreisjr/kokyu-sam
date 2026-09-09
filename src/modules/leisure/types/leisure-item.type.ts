import {
  LeisureDurationType,
  LeisureItemStatus,
  LeisureItemType,
  LeisurePriority,
} from '../constants/leisure-enums.constant';

/**
 * Domain shape returned by the API - `details` is inlined under the key
 * named by `type` (e.g. `{ type: 'movie', movie: {...} }`), matching the
 * frontend's discriminated union exactly rather than exposing the raw
 * `details` column name. See LeisureItemsRepository.toDomain.
 */
export interface LeisureItem {
  id: string;
  userId: string;
  type: LeisureItemType;
  title: string;
  description: string | null;
  status: LeisureItemStatus;
  coverImage: string | null;
  tags: string[];
  priority: LeisurePriority | null;
  estimatedDuration: number | null;
  durationType: LeisureDurationType;
  minimumUsefulDuration: number | null;
  favorite: boolean;
  source: string | null;
  sourceUrl: string | null;
  recommendedBy: string | null;
  /** The type-specific data slice (e.g. `{ runtime: 120 }` for a movie). Never re-keyed here - LeisureItemsController inlines it under `type` in the JSON response. */
  details: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface LeisureItemCreateInput {
  type: LeisureItemType;
  title: string;
  description?: string | null;
  status?: LeisureItemStatus;
  coverImage?: string | null;
  tags?: string[];
  priority?: LeisurePriority | null;
  estimatedDuration?: number | null;
  durationType?: LeisureDurationType;
  minimumUsefulDuration?: number | null;
  favorite?: boolean;
  source?: string | null;
  sourceUrl?: string | null;
  recommendedBy?: string | null;
  details: Record<string, unknown>;
}

/** Every field optional - a PATCH only ever touches what it sends. `type`/`details` travel together: sending one without the other is rejected by the schema. */
export type LeisureItemUpdateInput = Partial<LeisureItemCreateInput>;

export interface LeisureItemListFilter {
  type?: LeisureItemType;
  status?: LeisureItemStatus;
  favorite?: boolean;
  tag?: string;
  search?: string;
}
