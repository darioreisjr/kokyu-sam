/**
 * Server-side mirror of the plan-entry dialog's "not in the past" rule
 * (frontend: `buildPlanEntrySchema`/`PlanEntryPastReference`). Dates
 * ("YYYY-MM-DD") and times ("HH:mm"/"HH:mm:ss") compare correctly as
 * plain strings — same convention already used by
 * `listPlanQuerySchema`'s `startDate <= endDate` check — so there's no
 * need to parse into `Date`.
 *
 * Compares against the server's own UTC clock. This app has no
 * per-user timezone (see `profileBirthDateSchema`/`isFutureDateString`
 * for the same accepted tradeoff), so a boundary minute around
 * midnight UTC can disagree with the browser's local "now" that the
 * frontend validated against. Rare and low-stakes for a planning
 * feature; this check exists as defense-in-depth against the schema
 * layer being bypassed, not as the primary UX guard.
 */

/**
 * Postgres' `time` column always round-trips as "HH:mm:ss" regardless of
 * what was inserted - the API's own contract is "HH:mm", so every row
 * read back from `leisure_plan_entries` gets normalized through this
 * before it reaches a DTO (see `SupabaseLeisurePlanRepository.toDomain`).
 */
export function toHm(time: string | null): string | null {
  return time === null ? null : time.slice(0, 5);
}

/** The date/startTime/endTime a plan entry already had before this write. `undefined` (a fresh `create`) means every field counts as a new pick. */
export interface PlanEntryPastReference {
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

/** The fields of a create/update request relevant to the "not in the past" rule — only fields actually present on a PATCH are checked. */
export interface PlanEntryDateInput {
  date?: string;
  startTime?: string | null;
  endTime?: string | null;
}

export interface PlanEntryPastViolation {
  field: 'date' | 'startTime' | 'endTime';
  message: string;
}

/**
 * Returns the first "not in the past" violation in `input`, or `null`
 * when it holds up. A field only counts as a violation when it's a new
 * pick — i.e. it differs from `reference` (or there is no reference, as
 * in `create`) — so an entry already planned in the past stays
 * editable (title, notes, ...) without being forced onto a fresh date.
 */
/**
 * Whether `dateKey` ("YYYY-MM-DD") is the server's current UTC date —
 * same clock/tradeoff as `findPastPlanEntryViolation` above. Backs
 * `LeisurePlanService.complete()`'s "only completable on its scheduled
 * day" rule.
 */
export function isTodayKey(dateKey: string, now: Date = new Date()): boolean {
  return dateKey === now.toISOString().slice(0, 10);
}

export function findPastPlanEntryViolation(
  input: PlanEntryDateInput,
  reference?: PlanEntryPastReference,
  now: Date = new Date(),
): PlanEntryPastViolation | null {
  const todayKey = now.toISOString().slice(0, 10);
  const nowTime = now.toISOString().slice(11, 16);

  const dateProvided = input.date !== undefined;
  const dateChanged = dateProvided && input.date !== (reference?.date ?? undefined);
  if (dateChanged && input.date! < todayKey) {
    return { field: 'date', message: 'date cannot be in the past.' };
  }

  const effectiveDate = dateProvided ? input.date : (reference?.date ?? undefined);
  const isToday = effectiveDate === todayKey;

  if (isToday && input.startTime) {
    const startChanged = dateChanged || input.startTime !== (reference?.startTime ?? undefined);
    if (startChanged && input.startTime.slice(0, 5) < nowTime) {
      return { field: 'startTime', message: 'startTime cannot be in the past.' };
    }
  }

  if (isToday && input.endTime) {
    const endChanged = dateChanged || input.endTime !== (reference?.endTime ?? undefined);
    if (endChanged && input.endTime.slice(0, 5) < nowTime) {
      return { field: 'endTime', message: 'endTime cannot be in the past.' };
    }
  }

  return null;
}
