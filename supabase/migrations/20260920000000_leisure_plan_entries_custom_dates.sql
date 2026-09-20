-- Backs recurrence: 'custom' - an explicit set of specific calendar days,
-- as opposed to 'daily'/'weekly' (a computable step from `date`). Null/empty
-- for 'none'/'daily'/'weekly'; required non-empty only for 'custom', a rule
-- enforced at the Nest/Zod layer (see leisure-plan.schemas.ts), same as
-- start_time/end_time/duration being nullable columns with "required"
-- enforced only in the application.
--
-- `date` keeps acting as the series' anchor - for a 'custom' entry this is
-- set to the earliest value in custom_dates, so the existing
-- findByDateRange candidate filter (`date <= endDate`, `recurrence != 'none'`
-- bypassing `date >= startDate`) keeps working without any query change.
--
-- Per-occurrence completion reuses the existing leisure_plan_entry_completions
-- table (already keyed by plan_entry_id + occurrence_date for daily/weekly) -
-- no new table needed.

alter table public.leisure_plan_entries
  add column if not exists custom_dates date[];

comment on column public.leisure_plan_entries.custom_dates is 'Explicit set of calendar days for a recurrence = ''custom'' entry. Null for none/daily/weekly. Expanded into one occurrence per date by expandPlanEntriesForRange, same as daily/weekly''s computed step.';
