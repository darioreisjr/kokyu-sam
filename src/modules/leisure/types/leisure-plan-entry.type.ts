import { LeisureRecurrence } from '../constants/leisure-enums.constant';

export interface LeisurePlanEntry {
  id: string;
  userId: string;
  leisureItemId: string | null;
  title: string;
  /** The series' anchor/start date - never the specific day being displayed, see `occurrenceDate`. */
  date: string;
  /**
   * The calendar day this instance actually falls on. Equal to `date`
   * for a `recurrence: 'none'`/`'custom'` entry or when there's no
   * range-expansion context (create/update/findById); for a `'daily'`/
   * `'weekly'` entry listed via `findByDateRange`, this is the specific
   * occurrence within the requested range - see
   * `expandPlanEntriesForRange`.
   */
  occurrenceDate: string;
  startTime: string | null;
  endTime: string | null;
  duration: number | null;
  recurrence: LeisureRecurrence;
  notes: string | null;
  reminder: boolean;
  /** For `'daily'`/`'weekly'`, reflects `occurrenceDate` specifically (from `leisure_plan_entry_completions`), never the whole series. */
  completed: boolean;
  createdAt: string;
}

export interface LeisurePlanEntryCreateInput {
  leisureItemId?: string | null;
  title: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  duration?: number | null;
  recurrence?: LeisureRecurrence;
  notes?: string | null;
  reminder?: boolean;
  completed?: boolean;
}

export type LeisurePlanEntryUpdateInput = Partial<LeisurePlanEntryCreateInput>;
