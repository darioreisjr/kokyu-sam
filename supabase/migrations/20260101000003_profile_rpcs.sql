-- RLS-safe RPC functions for profile onboarding. Every function is
-- SECURITY DEFINER with an explicit, empty search_path (every identifier
-- below is schema-qualified) and identifies the caller exclusively via
-- auth.uid() - none of them accept a user id parameter, so a compromised
-- or buggy client can never act on another user's row.
--
-- This is defense in depth on top of Nest/Zod validation (see
-- src/modules/profiles/schemas), not a replacement for it - real
-- validation happens here too so a direct RPC call (bypassing Nest) can
-- never corrupt data or leak usernames.
--
-- NOTE: the literal `1` used for onboarding_version below must be kept in
-- sync with CURRENT_PROFILE_ONBOARDING_VERSION in
-- src/modules/profiles/constants/onboarding-version.constant.ts. A future
-- version bump needs a new migration that updates both.

-- Custom SQLSTATE used to signal "profile validation failed" in a way the
-- Nest layer can distinguish from a generic internal error - mapped to
-- ProfileValidationError in src/common/errors/supabase-error.mapper.ts.
-- ('KO001' is not a real Postgres-assigned SQLSTATE class.)

create or replace function public.complete_profile(
  p_first_name text,
  p_last_name text,
  p_username text,
  p_birth_date date,
  p_bio text default null,
  p_country_code text default null,
  p_region text default null,
  p_city text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_username text;
  v_result public.profiles;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  v_username := lower(trim(p_username));

  if p_first_name is null or length(trim(p_first_name)) = 0 then
    raise exception 'first_name is required' using errcode = 'KO001';
  end if;
  if p_last_name is null or length(trim(p_last_name)) = 0 then
    raise exception 'last_name is required' using errcode = 'KO001';
  end if;
  if v_username is null or v_username !~ '^[a-z][a-z0-9_.]{2,29}$' then
    raise exception 'username is invalid' using errcode = 'KO001';
  end if;
  if p_birth_date is null or p_birth_date > current_date then
    raise exception 'birth_date is invalid' using errcode = 'KO001';
  end if;

  -- Uniqueness is enforced by profiles_username_normalized_key - a
  -- unique_violation (23505) surfaces to the caller and is mapped to
  -- USERNAME_TAKEN by the Nest layer rather than pre-checked here, so
  -- there is no check-then-insert race window.
  update public.profiles
    set first_name = trim(p_first_name),
        last_name = trim(p_last_name),
        username = v_username,
        birth_date = p_birth_date,
        bio = nullif(trim(coalesce(p_bio, '')), ''),
        country_code = nullif(upper(trim(coalesce(p_country_code, ''))), ''),
        region = nullif(trim(coalesce(p_region, '')), ''),
        city = nullif(trim(coalesce(p_city, '')), ''),
        onboarding_completed_at = now(),
        onboarding_version = 1
    where id = v_uid
    returning * into v_result;

  if not found then
    raise exception 'Profile not found for current user' using errcode = 'P0002';
  end if;

  return v_result;
end;
$$;

comment on function public.complete_profile is
  'Atomically marks the caller''s own profile as onboarding-complete. Idempotent: calling again with valid data re-runs the same UPDATE and returns the current state without duplicating side effects.';

create or replace function public.update_profile(
  p_first_name text,
  p_last_name text,
  p_username text,
  p_birth_date date,
  p_bio text default null,
  p_country_code text default null,
  p_region text default null,
  p_city text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_username text;
  v_current public.profiles;
  v_result public.profiles;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_current from public.profiles where id = v_uid;
  if not found then
    raise exception 'Profile not found for current user' using errcode = 'P0002';
  end if;

  v_username := lower(trim(p_username));

  -- Once onboarding is complete, required fields may never be cleared -
  -- defense in depth on top of Nest/Zod, which already never sends an
  -- empty required field.
  if v_current.onboarding_completed_at is not null then
    if p_first_name is null or length(trim(p_first_name)) = 0
      or p_last_name is null or length(trim(p_last_name)) = 0
      or v_username is null or v_username = ''
      or p_birth_date is null
    then
      raise exception 'Required fields cannot be cleared once onboarding is complete'
        using errcode = 'KO001';
    end if;
  end if;

  if v_username is not null and v_username <> '' and v_username !~ '^[a-z][a-z0-9_.]{2,29}$' then
    raise exception 'username is invalid' using errcode = 'KO001';
  end if;
  if p_birth_date is not null and p_birth_date > current_date then
    raise exception 'birth_date is invalid' using errcode = 'KO001';
  end if;

  update public.profiles
    set first_name = case when p_first_name is null then first_name else trim(p_first_name) end,
        last_name = case when p_last_name is null then last_name else trim(p_last_name) end,
        username = case when v_username is null or v_username = '' then username else v_username end,
        birth_date = coalesce(p_birth_date, birth_date),
        bio = nullif(trim(coalesce(p_bio, '')), ''),
        country_code = nullif(upper(trim(coalesce(p_country_code, ''))), ''),
        region = nullif(trim(coalesce(p_region, '')), ''),
        city = nullif(trim(coalesce(p_city, '')), '')
        -- onboarding_completed_at / onboarding_version are intentionally
        -- untouched here - only complete_profile() sets them.
    where id = v_uid
    returning * into v_result;

  return v_result;
end;
$$;

comment on function public.update_profile is
  'Updates the caller''s own profile. Refuses to null out first_name/last_name/username/birth_date once onboarding_completed_at is set (raises KO001, mapped to PROFILE_VALIDATION_ERROR).';

-- Used by GET /api/v1/usernames/availability. Returns availability only -
-- never who owns a taken username (SECURITY DEFINER + no other columns
-- returned), and is safe to expose to anon since it takes no identity
-- parameter and performs its own format validation.
create or replace function public.is_username_available(p_username text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
begin
  v_username := lower(trim(p_username));

  if v_username is null or v_username = '' or v_username !~ '^[a-z][a-z0-9_.]{2,29}$' then
    return false;
  end if;

  return not exists (
    select 1 from public.profiles where lower(username) = v_username
  );
end;
$$;

comment on function public.is_username_available is
  'Format + uniqueness check only. Never reveals which user (if any) owns the username.';

-- Postgres grants EXECUTE to PUBLIC by default - revoke that and grant
-- explicitly per function, matching each function's intended callers.
revoke all on function public.complete_profile(text, text, text, date, text, text, text, text) from public;
revoke all on function public.update_profile(text, text, text, date, text, text, text, text) from public;
revoke all on function public.is_username_available(text) from public;

grant execute on function public.complete_profile(text, text, text, date, text, text, text, text) to authenticated;
grant execute on function public.update_profile(text, text, text, date, text, text, text, text) to authenticated;
grant execute on function public.is_username_available(text) to authenticated, anon;
