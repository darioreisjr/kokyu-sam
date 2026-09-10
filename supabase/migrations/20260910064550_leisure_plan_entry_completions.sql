-- Per-occurrence completion tracking for recurring (daily/weekly)
-- leisure_plan_entries rows.
--
-- A recurring row is the whole series: one row, `date` as its
-- anchor/start, recurring daily or every 7 days indefinitely (see
-- src/modules/leisure/leisure-plan-recurrence.util.ts). Completing
-- "today's" occurrence must never affect yesterday's or tomorrow's, so
-- per-occurrence completion can't live on leisure_plan_entries.completed
-- (a single boolean shared by every occurrence). This table is the one
-- source of truth for "was this specific calendar date of this series
-- completed".
--
-- Never touched for recurrence = 'none'/'custom' entries - those keep
-- using leisure_plan_entries.completed exactly as before (a single
-- occurrence has nothing to disambiguate a date against).

create table if not exists public.leisure_plan_entry_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_entry_id uuid not null references public.leisure_plan_entries (id) on delete cascade,
  occurrence_date date not null,
  completed_at timestamptz not null default now(),
  unique (plan_entry_id, occurrence_date)
);

comment on table public.leisure_plan_entry_completions is 'Which individual occurrence dates of a recurring (daily/weekly) leisure_plan_entries row have been completed. Irrelevant for recurrence = none/custom, which use leisure_plan_entries.completed directly.';

create index if not exists leisure_plan_entry_completions_entry_idx on public.leisure_plan_entry_completions (plan_entry_id);
create index if not exists leisure_plan_entry_completions_user_date_idx on public.leisure_plan_entry_completions (user_id, occurrence_date);

alter table public.leisure_plan_entry_completions enable row level security;
revoke all on public.leisure_plan_entry_completions from anon, authenticated;
-- No update grant: a completion is either recorded (insert) or undone
-- (delete) - there's nothing on the row itself worth partially mutating.
grant select, insert, delete on public.leisure_plan_entry_completions to authenticated;

create policy "leisure_plan_entry_completions_select_own" on public.leisure_plan_entry_completions
  for select to authenticated using (auth.uid() = user_id);
create policy "leisure_plan_entry_completions_insert_own" on public.leisure_plan_entry_completions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "leisure_plan_entry_completions_delete_own" on public.leisure_plan_entry_completions
  for delete to authenticated using (auth.uid() = user_id);
