import { parseISODateString } from '../../common/utils/age.util';
import { LeisurePlanEntry } from './types/leisure-plan-entry.type';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetweenDateKeys(from: string, to: string): number {
  return Math.round(
    (parseISODateString(to).getTime() - parseISODateString(from).getTime()) / MS_PER_DAY,
  );
}

function addDaysToDateKey(key: string, days: number): string {
  const date = parseISODateString(key);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The `leisure_plan_entry_completions` lookup key for a given entry/occurrence pair. */
export function occurrenceCompletionKey(planEntryId: string, occurrenceDate: string): string {
  return `${planEntryId}|${occurrenceDate}`;
}

/**
 * The smallest date on/after `start` that's `stepDays` apart from
 * `anchor` (i.e. a real occurrence of a series starting at `anchor`
 * and repeating every `stepDays` days) - or `anchor` itself when it's
 * already on/after `start`. `stepDays: 1` (daily) always resolves to
 * `start` itself, since every date is "1 day apart" from any other.
 */
function firstOccurrenceOnOrAfter(anchor: string, start: string, stepDays: number): string {
  if (anchor >= start) return anchor;
  const diff = daysBetweenDateKeys(anchor, start);
  const remainder = diff % stepDays;
  const offset = remainder === 0 ? 0 : stepDays - remainder;
  return addDaysToDateKey(start, offset);
}

/**
 * Expands the raw `leisure_plan_entries` rows relevant to
 * `[startDate, endDate]` into one occurrence per calendar day they
 * actually land on within that range.
 *
 * A `recurrence: 'daily'`/`'weekly'` row represents the whole series -
 * one row, `date` as its anchor/start - repeating every day (or every 7
 * days) forever after that, per the feature request: "a partir da data
 * que foi cadastrada, em diante, todo dia". A `'custom'` row also
 * represents a whole series, but its days are an explicit set
 * (`customDates`) rather than a computable step - `date` is kept in sync
 * as the earliest of that set (see `LeisurePlanService`/repository), so
 * it still sorts and filters like every other row. `'none'` rows only
 * ever occur on their own `date`.
 *
 * Each returned entry keeps `date` as the series' anchor (so editing an
 * occurrence still edits the true start date, never silently reschedules
 * it) and adds `occurrenceDate` - the specific day this instance falls
 * on - which callers should group/display by instead.
 *
 * `completedOccurrences` (keys from `occurrenceCompletionKey`) is the
 * only source of truth for a recurring row's per-day `completed`,
 * including `'custom'` now (each marked date completes independently,
 * same as daily/weekly); a `'none'` row keeps using its own `completed`
 * column, untouched by this table.
 */
export function expandPlanEntriesForRange(
  entries: LeisurePlanEntry[],
  startDate: string,
  endDate: string,
  completedOccurrences: ReadonlySet<string>,
): LeisurePlanEntry[] {
  const occurrences: LeisurePlanEntry[] = [];

  for (const entry of entries) {
    if (entry.recurrence === 'daily' || entry.recurrence === 'weekly') {
      const stepDays = entry.recurrence === 'daily' ? 1 : 7;
      for (
        let occurrenceDate = firstOccurrenceOnOrAfter(entry.date, startDate, stepDays);
        occurrenceDate <= endDate;
        occurrenceDate = addDaysToDateKey(occurrenceDate, stepDays)
      ) {
        occurrences.push({
          ...entry,
          occurrenceDate,
          completed: completedOccurrences.has(occurrenceCompletionKey(entry.id, occurrenceDate)),
        });
      }
    } else if (entry.recurrence === 'custom' && entry.customDates) {
      for (const occurrenceDate of entry.customDates) {
        if (occurrenceDate >= startDate && occurrenceDate <= endDate) {
          occurrences.push({
            ...entry,
            occurrenceDate,
            completed: completedOccurrences.has(occurrenceCompletionKey(entry.id, occurrenceDate)),
          });
        }
      }
    } else if (entry.date >= startDate && entry.date <= endDate) {
      occurrences.push({ ...entry, occurrenceDate: entry.date });
    }
  }

  return occurrences;
}
