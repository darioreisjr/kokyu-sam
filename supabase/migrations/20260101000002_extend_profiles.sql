-- Extends public.profiles for the mandatory-profile-completion feature.
-- Drops `onboarding_complete boolean` as the source of truth in favor of a
-- derived value (see src/modules/profiles/services/profile-completion.service.ts):
-- a profile is "complete" when
--   onboarding_completed_at IS NOT NULL
--   AND onboarding_version >= CURRENT_PROFILE_ONBOARDING_VERSION (app constant)
--   AND every required field is present.
--
-- This is dev/pre-launch data (no production users yet), so the backfill
-- below is intentionally simple: any row that was already
-- onboarding_complete = true is treated as having completed onboarding
-- "now", at version 0 (so it will be asked to re-confirm once version 1's
-- extra fields, if any, are introduced later - version 0 already exists
-- below to represent "completed under the old, pre-versioned rules").

alter table public.profiles
  add column if not exists bio text,
  add column if not exists avatar_path text,
  add column if not exists avatar_external_url text,
  add column if not exists country_code text,
  add column if not exists region text,
  add column if not exists city text,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_version integer not null default 0,
  add column if not exists profile_bootstrapped_at timestamptz;

comment on column public.profiles.avatar_path is
  'Storage object path in the "avatars" bucket (e.g. "<uid>/<file>"). Never a URL - resolved to a signed URL at read time. Priority over avatar_external_url.';
comment on column public.profiles.avatar_external_url is
  'Avatar URL sourced from an identity provider (e.g. Google picture). Only used when avatar_path is null.';
comment on column public.profiles.onboarding_completed_at is
  'Set exactly once, atomically, by the complete_profile() RPC. NULL means onboarding has not been completed.';
comment on column public.profiles.onboarding_version is
  'Set to CURRENT_PROFILE_ONBOARDING_VERSION by complete_profile() when onboarding completes. Used together with onboarding_completed_at to derive completion - see ProfileCompletionService.';
comment on column public.profiles.profile_bootstrapped_at is
  'Set once by ProfileBootstrapService the first time it fills profile fields from Auth identity metadata. Never re-copies over user-chosen values.';

-- Backfill: rows already marked onboarding_complete under the old scheme
-- are treated as completed under onboarding_version = 0, which will
-- naturally read as "incomplete" once CURRENT_PROFILE_ONBOARDING_VERSION
-- moves to 1 and stays that way going forward - exactly the "force
-- everyone back through onboarding on a version bump" behavior this
-- versioning scheme exists for.
update public.profiles
  set onboarding_completed_at = coalesce(onboarding_completed_at, updated_at, created_at, now()),
      onboarding_version = greatest(onboarding_version, 0)
  where onboarding_complete = true
    and onboarding_completed_at is null;

alter table public.profiles
  drop column if exists onboarding_complete;

-- Fold the old single `avatar_url` column into avatar_external_url (it was
-- always an externally-hosted URL in Phase 1 - there was no upload flow
-- yet), then drop it. Nothing external depends on the old column.
update public.profiles
  set avatar_external_url = avatar_url
  where avatar_url is not null
    and avatar_external_url is null;

alter table public.profiles
  drop column if exists avatar_url;

-- Reconciled username format, enforced at the database level too (defense
-- in depth on top of Zod/Nest validation): must start with a letter,
-- 3-30 characters, lowercase letters/digits/"_"/"." only. Must match
-- src/common/utils/username.util.ts USERNAME_PATTERN exactly.
alter table public.profiles
  drop constraint if exists profiles_username_length;

alter table public.profiles
  add constraint profiles_username_format check (
    username is null or username ~ '^[a-z][a-z0-9_.]{2,29}$'
  );

comment on column public.profiles.username is
  'Always stored lowercase/normalized - see normalizeUsername(). Format enforced by profiles_username_format, case-insensitive uniqueness by profiles_username_normalized_key.';
