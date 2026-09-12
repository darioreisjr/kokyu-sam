-- Product decision: leisure_plan_entries must never be hard-deleted, by
-- anyone, anywhere. Archiving is the only removal mechanism, and it's
-- reversible (unarchive) - see LeisurePlanService.archive/unarchive.
--
-- Defense in depth: this is enforced at the Nest layer (leisure-plan.
-- controller.ts no longer exposes DELETE, leisure-plan.repository.ts no
-- longer has a delete() method at all) AND at the database layer below, so
-- even a bug or a direct authenticated Supabase call can't delete a row
-- here.

alter table public.leisure_plan_entries
  add column if not exists archived boolean not null default false,
  add column if not exists archived_at timestamptz;

comment on column public.leisure_plan_entries.archived is 'Soft-removal flag - the only way a plan entry is ever "deleted". Reversible via unarchive. Never touched by update() - see LeisurePlanService.';
comment on column public.leisure_plan_entries.archived_at is 'When `archived` was last set to true; cleared back to null on unarchive.';

-- No replacement delete policy: this table has no delete policy at all from
-- here on, for any role. With RLS enabled, a command with zero policies is
-- denied outright for every row, not merely filtered - so this alone makes
-- DELETE impossible even for a valid, auth.uid()-scoped authenticated
-- client. The explicit revoke below is belt-and-suspenders on top of that.
drop policy if exists "leisure_plan_entries_delete_own" on public.leisure_plan_entries;
revoke delete on public.leisure_plan_entries from authenticated;

-- Supports both the new "list archived entries" query (GET .../archived,
-- `archived = true`) and findByDateRange's added `archived = false` filter,
-- mirroring the existing (user_id, archived) pattern already used by
-- leisure_notes for the same shape of query.
create index if not exists leisure_plan_entries_user_archived_idx
  on public.leisure_plan_entries (user_id, archived);
