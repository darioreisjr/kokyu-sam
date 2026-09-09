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
