-- Tempo Livre (Leisure) domain: a personal library of things to watch/read/
-- play/visit (leisure_items), a schedule of planned occurrences
-- (leisure_plan_entries), a logbook of things actually done
-- (leisure_log_entries), free-form notes (leisure_notes) and named lists
-- (leisure_collections / leisure_collection_items).
--
-- Every table is scoped by user_id + RLS ("auth.uid() = user_id" on every
-- policy) - defense in depth alongside the Nest layer, per
-- docs/architecture.md "Autorizacao futura". Unlike profiles (1:1 with
-- auth.users, mutations behind SECURITY DEFINER RPCs because of complex
-- versioned validation), these are plain user-owned rows with straightforward
-- validation, so they use direct table grants + RLS instead of RPCs.
--
-- Type-specific fields (a movie's runtime, a book's currentPage, ...) live in
-- a single `details jsonb` column rather than 15 sets of nullable columns:
-- every future Kokyu domain (missions, habits, goals, training, nutrition,
-- daily-rhythm) will have its own per-type variability, and a wide table of
-- mostly-null columns doesn't scale across that many domains. Nest validates
-- `details` per `type` with Zod (see src/modules/leisure/schemas) before it
-- ever reaches Postgres.

-- ---------------------------------------------------------------------------
-- leisure_items
-- ---------------------------------------------------------------------------

create table if not exists public.leisure_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  description text,
  status text not null default 'backlog',
  cover_image text,
  tags text[] not null default '{}',
  priority text,
  estimated_duration integer,
  duration_type text not null default 'unknown',
  minimum_useful_duration integer,
  favorite boolean not null default false,
  source text,
  source_url text,
  recommended_by text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint leisure_items_type_check check (
    type in (
      'movie', 'tvShow', 'book', 'audiobook', 'game', 'podcast', 'music',
      'video', 'article', 'website', 'place', 'event', 'activity', 'hobby',
      'custom', 'unsorted'
    )
  ),
  constraint leisure_items_status_check check (
    status in ('backlog', 'planned', 'inProgress', 'completed', 'paused', 'abandoned', 'archived')
  ),
  constraint leisure_items_priority_check check (priority is null or priority in ('low', 'medium', 'high')),
  constraint leisure_items_duration_type_check check (duration_type in ('fixed', 'flexible', 'unknown')),
  constraint leisure_items_estimated_duration_check check (estimated_duration is null or estimated_duration > 0),
  constraint leisure_items_minimum_useful_duration_check check (
    minimum_useful_duration is null or minimum_useful_duration > 0
  ),
  constraint leisure_items_title_length check (char_length(title) between 1 and 200)
);

comment on table public.leisure_items is 'A user''s leisure library (Tempo Livre): things to watch/read/play/visit/do.';
comment on column public.leisure_items.details is 'Type-specific data slice (e.g. {"runtime": 120} for a movie), shaped per `type`. Validated by Zod in the Nest layer, not by a DB constraint - the set of shapes grows with product features.';
comment on column public.leisure_items.tags is 'Free tags plus recognized context tags (e.g. "em-casa"); never a separate column, matching the frontend contract.';

create index if not exists leisure_items_user_id_idx on public.leisure_items (user_id);
create index if not exists leisure_items_user_status_idx on public.leisure_items (user_id, status);
create index if not exists leisure_items_user_type_idx on public.leisure_items (user_id, type);
create index if not exists leisure_items_user_favorite_idx on public.leisure_items (user_id) where favorite;
create index if not exists leisure_items_tags_gin_idx on public.leisure_items using gin (tags);

drop trigger if exists set_leisure_items_updated_at on public.leisure_items;
create trigger set_leisure_items_updated_at
  before update on public.leisure_items
  for each row
  execute function public.set_updated_at();

alter table public.leisure_items enable row level security;
revoke all on public.leisure_items from anon, authenticated;
grant select, insert, update, delete on public.leisure_items to authenticated;

create policy "leisure_items_select_own" on public.leisure_items
  for select to authenticated using (auth.uid() = user_id);
create policy "leisure_items_insert_own" on public.leisure_items
  for insert to authenticated with check (auth.uid() = user_id);
create policy "leisure_items_update_own" on public.leisure_items
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "leisure_items_delete_own" on public.leisure_items
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- leisure_plan_entries
-- ---------------------------------------------------------------------------

create table if not exists public.leisure_plan_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  leisure_item_id uuid references public.leisure_items (id) on delete set null,
  title text not null,
  date date not null,
  start_time time,
  end_time time,
  duration integer,
  recurrence text not null default 'none',
  notes text,
  reminder boolean not null default false,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint leisure_plan_entries_recurrence_check check (recurrence in ('none', 'daily', 'weekly', 'custom')),
  constraint leisure_plan_entries_duration_check check (duration is null or duration > 0),
  constraint leisure_plan_entries_title_length check (char_length(title) between 1 and 200)
);

comment on table public.leisure_plan_entries is 'Scheduled leisure occurrences ("Agenda"). Never the item itself - a plan entry references leisure_items only optionally (ad hoc entries have no item).';

create index if not exists leisure_plan_entries_user_date_idx on public.leisure_plan_entries (user_id, date);
create index if not exists leisure_plan_entries_item_idx on public.leisure_plan_entries (leisure_item_id);

alter table public.leisure_plan_entries enable row level security;
revoke all on public.leisure_plan_entries from anon, authenticated;
grant select, insert, update, delete on public.leisure_plan_entries to authenticated;

create policy "leisure_plan_entries_select_own" on public.leisure_plan_entries
  for select to authenticated using (auth.uid() = user_id);
create policy "leisure_plan_entries_insert_own" on public.leisure_plan_entries
  for insert to authenticated with check (auth.uid() = user_id);
create policy "leisure_plan_entries_update_own" on public.leisure_plan_entries
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "leisure_plan_entries_delete_own" on public.leisure_plan_entries
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- leisure_log_entries
-- ---------------------------------------------------------------------------

create table if not exists public.leisure_log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  leisure_item_id uuid references public.leisure_items (id) on delete set null,
  activity_type text not null,
  title text not null,
  started_at timestamptz,
  completed_at timestamptz not null,
  duration integer,
  rating integer,
  notes text,
  created_at timestamptz not null default now(),
  constraint leisure_log_entries_activity_type_check check (
    activity_type in (
      'movie', 'tvShow', 'book', 'audiobook', 'game', 'podcast', 'music',
      'video', 'article', 'website', 'place', 'event', 'activity', 'hobby',
      'custom', 'unsorted'
    )
  ),
  constraint leisure_log_entries_rating_check check (rating is null or rating between 1 and 5),
  constraint leisure_log_entries_duration_check check (duration is null or duration > 0),
  constraint leisure_log_entries_title_length check (char_length(title) between 1 and 200)
);

comment on table public.leisure_log_entries is 'Logbook - one row per occurrence (watching the same movie twice logs two rows). activity_type/title are denormalized snapshots of the item at logging time, so history stays readable after the source item is edited or deleted.';

create index if not exists leisure_log_entries_user_completed_idx
  on public.leisure_log_entries (user_id, completed_at desc);
create index if not exists leisure_log_entries_item_idx on public.leisure_log_entries (leisure_item_id);

alter table public.leisure_log_entries enable row level security;
revoke all on public.leisure_log_entries from anon, authenticated;
grant select, insert, update, delete on public.leisure_log_entries to authenticated;

create policy "leisure_log_entries_select_own" on public.leisure_log_entries
  for select to authenticated using (auth.uid() = user_id);
create policy "leisure_log_entries_insert_own" on public.leisure_log_entries
  for insert to authenticated with check (auth.uid() = user_id);
create policy "leisure_log_entries_update_own" on public.leisure_log_entries
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "leisure_log_entries_delete_own" on public.leisure_log_entries
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- leisure_notes
-- ---------------------------------------------------------------------------

create table if not exists public.leisure_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  content text not null default '',
  type text not null default 'text',
  checklist_items jsonb not null default '[]'::jsonb,
  link_url text,
  tags text[] not null default '{}',
  pinned boolean not null default false,
  archived boolean not null default false,
  reminder_date timestamptz,
  related_leisure_item_id uuid references public.leisure_items (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leisure_notes_type_check check (type in ('text', 'checklist', 'link', 'idea'))
);

comment on table public.leisure_notes is 'Free-form notes (text/checklist/link/idea), optionally related to one leisure_items row.';

create index if not exists leisure_notes_user_pinned_idx on public.leisure_notes (user_id) where pinned;
create index if not exists leisure_notes_user_archived_idx on public.leisure_notes (user_id, archived);
create index if not exists leisure_notes_related_item_idx on public.leisure_notes (related_leisure_item_id);

drop trigger if exists set_leisure_notes_updated_at on public.leisure_notes;
create trigger set_leisure_notes_updated_at
  before update on public.leisure_notes
  for each row
  execute function public.set_updated_at();

alter table public.leisure_notes enable row level security;
revoke all on public.leisure_notes from anon, authenticated;
grant select, insert, update, delete on public.leisure_notes to authenticated;

create policy "leisure_notes_select_own" on public.leisure_notes
  for select to authenticated using (auth.uid() = user_id);
create policy "leisure_notes_insert_own" on public.leisure_notes
  for insert to authenticated with check (auth.uid() = user_id);
create policy "leisure_notes_update_own" on public.leisure_notes
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "leisure_notes_delete_own" on public.leisure_notes
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- leisure_collections + leisure_collection_items
-- ---------------------------------------------------------------------------

create table if not exists public.leisure_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leisure_collections_name_length check (char_length(name) between 1 and 120)
);

comment on table public.leisure_collections is 'Named personal lists (e.g. "Filmes para domingo"). Items belong by reference only - see leisure_collection_items.';

drop trigger if exists set_leisure_collections_updated_at on public.leisure_collections;
create trigger set_leisure_collections_updated_at
  before update on public.leisure_collections
  for each row
  execute function public.set_updated_at();

alter table public.leisure_collections enable row level security;
revoke all on public.leisure_collections from anon, authenticated;
grant select, insert, update, delete on public.leisure_collections to authenticated;

create policy "leisure_collections_select_own" on public.leisure_collections
  for select to authenticated using (auth.uid() = user_id);
create policy "leisure_collections_insert_own" on public.leisure_collections
  for insert to authenticated with check (auth.uid() = user_id);
create policy "leisure_collections_update_own" on public.leisure_collections
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "leisure_collections_delete_own" on public.leisure_collections
  for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.leisure_collection_items (
  collection_id uuid not null references public.leisure_collections (id) on delete cascade,
  item_id uuid not null references public.leisure_items (id) on delete cascade,
  -- Denormalized from leisure_collections.user_id so RLS here never needs a
  -- join/subquery to the parent table - the FKs above already guarantee it
  -- can never disagree with the parent's owner (both are validated by Nest
  -- before insert, and a user can only ever reference their own rows on
  -- both sides thanks to each table's own RLS).
  user_id uuid not null references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (collection_id, item_id)
);

comment on table public.leisure_collection_items is 'Junction: which leisure_items belong to which leisure_collections. An item can belong to several collections; nothing is physically moved.';

create index if not exists leisure_collection_items_item_idx on public.leisure_collection_items (item_id);

alter table public.leisure_collection_items enable row level security;
revoke all on public.leisure_collection_items from anon, authenticated;
grant select, insert, update, delete on public.leisure_collection_items to authenticated;

create policy "leisure_collection_items_select_own" on public.leisure_collection_items
  for select to authenticated using (auth.uid() = user_id);
create policy "leisure_collection_items_insert_own" on public.leisure_collection_items
  for insert to authenticated with check (auth.uid() = user_id);
create policy "leisure_collection_items_delete_own" on public.leisure_collection_items
  for delete to authenticated using (auth.uid() = user_id);
