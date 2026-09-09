/**
 * Single source of truth for every closed vocabulary in the leisure domain.
 * Mirrors the frontend's `constants/leisureItemTypes.ts` /
 * `constants/leisureStatuses.ts` (kokyu frontend repo) - the two are kept in
 * sync by hand, same as `feature-flags.constants.ts` already does for
 * navigation ids. Also mirrored by the `check` constraints in
 * supabase/migrations/20260102000000_create_leisure.sql - if a value is
 * added here, add it there too.
 */
export const LEISURE_ITEM_TYPES = [
  'movie',
  'tvShow',
  'book',
  'audiobook',
  'game',
  'podcast',
  'music',
  'video',
  'article',
  'website',
  'place',
  'event',
  'activity',
  'hobby',
  'custom',
  'unsorted',
] as const;

export type LeisureItemType = (typeof LEISURE_ITEM_TYPES)[number];

export const LEISURE_ITEM_STATUSES = [
  'backlog',
  'planned',
  'inProgress',
  'completed',
  'paused',
  'abandoned',
  'archived',
] as const;

export type LeisureItemStatus = (typeof LEISURE_ITEM_STATUSES)[number];

export const LEISURE_DURATION_TYPES = ['fixed', 'flexible', 'unknown'] as const;
export type LeisureDurationType = (typeof LEISURE_DURATION_TYPES)[number];

export const LEISURE_PRIORITIES = ['low', 'medium', 'high'] as const;
export type LeisurePriority = (typeof LEISURE_PRIORITIES)[number];

export const LEISURE_RECURRENCES = ['none', 'daily', 'weekly', 'custom'] as const;
export type LeisureRecurrence = (typeof LEISURE_RECURRENCES)[number];

export const LEISURE_NOTE_TYPES = ['text', 'checklist', 'link', 'idea'] as const;
export type LeisureNoteType = (typeof LEISURE_NOTE_TYPES)[number];
