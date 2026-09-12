import {
  LeisurePlanEntry,
  LeisurePlanEntryCreateInput,
  LeisurePlanEntryUpdateInput,
} from './leisure-plan-entry.type';

export const LEISURE_PLAN_REPOSITORY = Symbol('LEISURE_PLAN_REPOSITORY');

export interface LeisurePlanRepository {
  findByDateRange: (
    accessToken: string,
    startDate: string,
    endDate: string,
  ) => Promise<LeisurePlanEntry[]>;
  findById: (accessToken: string, id: string) => Promise<LeisurePlanEntry | null>;
  /**
   * Which `${planEntryId}|${occurrenceDate}` keys (see
   * `occurrenceCompletionKey`) have a recorded completion within
   * `[startDate, endDate]` - the per-day completion state for
   * `recurrence: 'daily'`/`'weekly'` entries in that range.
   */
  findCompletedOccurrences: (
    accessToken: string,
    startDate: string,
    endDate: string,
  ) => Promise<Set<string>>;
  /**
   * Records that `occurrenceDate` of `planEntryId`'s series was completed.
   * Idempotent - completing the same day twice is a no-op. Resolves `true`
   * only the first time (a fresh row was inserted), `false` on every
   * repeat - the caller's signal for whether this call should also log a
   * history entry.
   */
  markOccurrenceCompleted: (
    accessToken: string,
    userId: string,
    planEntryId: string,
    occurrenceDate: string,
  ) => Promise<boolean>;
  create: (
    accessToken: string,
    userId: string,
    input: LeisurePlanEntryCreateInput,
  ) => Promise<LeisurePlanEntry>;
  update: (
    accessToken: string,
    id: string,
    patch: LeisurePlanEntryUpdateInput,
  ) => Promise<LeisurePlanEntry | null>;
  /** Sets `archived: true` / `archivedAt: now()`. `null` if no row matches `id` (mirrors `update`'s not-found convention). Plan entries are never hard-deleted - this is the only removal mechanism. */
  archive: (accessToken: string, id: string) => Promise<LeisurePlanEntry | null>;
  /** Inverse of `archive`: sets `archived: false` / `archivedAt: null`. `null` if no row matches `id`. */
  unarchive: (accessToken: string, id: string) => Promise<LeisurePlanEntry | null>;
  /** Every archived entry for the authenticated user (RLS-scoped), unfiltered by date and never expanded into recurrence occurrences - archived entries are shown as flat rows by their own `date`. */
  findArchived: (accessToken: string) => Promise<LeisurePlanEntry[]>;
}
