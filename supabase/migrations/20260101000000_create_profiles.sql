-- Kokyu profile data for each Supabase Auth user.
-- Never duplicates password/password hash/refresh tokens - those belong
-- exclusively to auth.users / Supabase Auth.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  username text,
  birth_date date,
  avatar_url text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length check (
    username is null or char_length(username) between 3 and 30
  )
);

comment on table public.profiles is
  'Kokyu-specific profile data for an auth.users row. 1:1 with auth.users, created automatically by handle_new_user().';
comment on column public.profiles.id is 'References auth.users.id - the single source of user identity.';
comment on column public.profiles.onboarding_complete is
  'Simple boolean for Phase 1. May become a derived/versioned value once required-field rules grow (see docs/architecture.md).';

-- Case-insensitive uniqueness: "Dario", "dario" and "DARIO" are the same
-- username. NULL usernames (Google sign-ups awaiting onboarding) are
-- allowed and excluded from the uniqueness check.
create unique index if not exists profiles_username_normalized_key
  on public.profiles (lower(username))
  where username is not null;

-- Reusable updated_at trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Row Level Security -----------------------------------------------------

alter table public.profiles enable row level security;

-- Least privilege: revoke the broad defaults PostgREST grants before
-- re-granting exactly what each role needs.
revoke all on public.profiles from anon, authenticated;

-- authenticated users may only ever read/update their own row. INSERT is
-- intentionally not granted here - profile creation happens exclusively
-- through the handle_new_user() trigger (SECURITY DEFINER), so a
-- compromised or buggy client can never fabricate a profile for another id.
grant select, update on public.profiles to authenticated;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- anon has no grants on this table at all: no policy is created for it,
-- and the revoke above already removed default privileges.
