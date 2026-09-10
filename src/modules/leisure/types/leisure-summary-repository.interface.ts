import { LeisureSummaryBase } from './leisure-summary.type';

export const LEISURE_SUMMARY_REPOSITORY = Symbol('LEISURE_SUMMARY_REPOSITORY');

/**
 * Deliberately separate from LeisureItemsRepository/LeisurePlanRepository:
 * GET /leisure/summary (Home screen) must never pull a full items/plan
 * list just to derive three small values - this repository only ever
 * selects the handful of columns each of those values actually needs.
 *
 * `plannedToday` isn't computed here - see `LeisureSummaryBase` - because
 * it must go through `LeisurePlanService.findByDateRange` to be
 * recurrence-aware, not a plain `leisure_plan_entries.date = today` query.
 */
export interface LeisureSummaryRepository {
  getSummary: (accessToken: string) => Promise<LeisureSummaryBase>;
  /** The one column `LeisureSummaryService` needs to resolve `plannedToday`'s item type - never a full `LeisureItem` fetch. */
  getItemType: (accessToken: string, itemId: string) => Promise<string | null>;
}
