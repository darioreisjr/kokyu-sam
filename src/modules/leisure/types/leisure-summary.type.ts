/**
 * Shape for GET /leisure/summary - exactly what HomeLeisureSummary /
 * leisureHomeProvider (kokyu frontend repo) need, computed server-side from
 * a handful of small queries instead of the Home screen ever fetching the
 * full item list just to derive three numbers.
 */
export interface LeisureHomeItemRef {
  id: string;
  title: string;
  type: string;
  startTime?: string | null;
}

export interface LeisureSummary {
  plannedToday: LeisureHomeItemRef | null;
  inProgress: LeisureHomeItemRef | null;
  backlogCount: number;
}

/**
 * What `LeisureSummaryRepository.getSummary` still computes directly -
 * `plannedToday` moved to `LeisureSummaryService`, which derives it from
 * `LeisurePlanService.findByDateRange` instead (recurrence-aware: a
 * daily/weekly plan entry anchored on an earlier date still counts as
 * "planned today").
 */
export type LeisureSummaryBase = Omit<LeisureSummary, 'plannedToday'>;
