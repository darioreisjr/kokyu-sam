-- Automatically creates a minimal public.profiles row whenever a new
-- auth.users row is created (email signup or any OAuth provider, e.g.
-- Google). Must never fail user creation - if optional metadata is
-- missing or malformed, the profile is still created with those fields
-- left null and onboarding_complete = false.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
-- Explicit, empty search_path prevents search-path hijacking in a
-- SECURITY DEFINER function; every identifier below is schema-qualified.
set search_path = ''
as $$
declare
  safe_first_name text;
  safe_last_name text;
  safe_username text;
  safe_birth_date date;
begin
  -- Only ever copy user-supplied *profile* metadata (never role, tokens,
  -- or provider tokens - those are not present in raw_user_meta_data and
  -- must never be trusted for authorization even if they were).
  safe_first_name := nullif(trim(new.raw_user_meta_data ->> 'first_name'), '');
  safe_last_name := nullif(trim(new.raw_user_meta_data ->> 'last_name'), '');
  safe_username := nullif(trim(new.raw_user_meta_data ->> 'username'), '');

  begin
    safe_birth_date := (new.raw_user_meta_data ->> 'birth_date')::date;
  exception
    when others then
      -- Malformed/absent birth_date must never block account creation.
      safe_birth_date := null;
  end;

  begin
    insert into public.profiles (id, first_name, last_name, username, birth_date)
    values (new.id, safe_first_name, safe_last_name, safe_username, safe_birth_date)
    on conflict (id) do nothing;
  exception
    when unique_violation then
      -- The requested username was already taken by the time this trigger
      -- ran (race with another signup). Never fail account creation over
      -- it - the profile is created without a username and the frontend
      -- can prompt the user to choose another one during onboarding.
      insert into public.profiles (id, first_name, last_name, birth_date)
      values (new.id, safe_first_name, safe_last_name, safe_birth_date)
      on conflict (id) do nothing;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
