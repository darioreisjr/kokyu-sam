import { LeisureSummary } from './leisure-summary.type';

export const LEISURE_SUMMARY_REPOSITORY = Symbol('LEISURE_SUMMARY_REPOSITORY');

/**
 * Deliberately separate from LeisureItemsRepository/LeisurePlanRepository:
 * GET /leisure/summary (Home screen) must never pull a full items/plan
 * list just to derive three small values - this repository only ever
 * selects the handful of columns each of those values actually needs.
 */
export interface LeisureSummaryRepository {
  getSummary: (accessToken: string, date: string) => Promise<LeisureSummary>;
}
