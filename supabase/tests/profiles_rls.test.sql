-- Database security tests for public.profiles RLS + the profile onboarding
-- RPCs (complete_profile, update_profile, is_username_available).
-- Run with: `supabase test db` (requires `supabase start`).
--
-- Proves:
--   * handle_new_user() creates a profile for each new auth user.
--   * User A can read their own profile.
--   * User A cannot read User B's profile.
--   * User A's UPDATE against User B's profile silently affects 0 rows.
--   * anon cannot select from profiles at all (no rows, no privilege).
--   * complete_profile()/update_profile() only ever affect the caller's
--     own row (auth.uid()-derived, no user id parameter to spoof).
--   * username uniqueness is enforced case-insensitively, including via
--     the RPCs.
--   * update_profile() refuses to null out required fields once onboarding
--     is complete.
--   * is_username_available() never reveals which user owns a username.

begin;
select plan(14);

create extension if not exists pgtap with schema extensions;

-- Inserting directly into auth.users exercises the same handle_new_user()
-- trigger real signups go through.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'user-a@example.test', '{"username":"usera"}'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@example.test', '{"username":"userb"}');

select is(
  (select count(*)::int from public.profiles where id in (
    '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'
  )),
  2,
  'handle_new_user() created a profile row for each new auth user'
);

-- --- Simulate User A ------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select count(*)::int from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  1,
  'User A can select their own profile'
);

select is(
  (select count(*)::int from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  0,
  'User A cannot select User B profile'
);

update public.profiles
  set username = 'hijacked'
  where id = '22222222-2222-2222-2222-222222222222';

reset role;
reset request.jwt.claims;

select isnt(
  (select username from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'hijacked',
  'User A cannot update User B profile - RLS matched 0 rows for the UPDATE'
);

-- --- complete_profile() / update_profile() only ever touch auth.uid() ----
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select public.complete_profile(
  'Ada', 'Lovelace', 'usera', '1990-01-01'::date, 'bio text', 'BR', 'SP', 'Sao Paulo'
);

select is(
  (select username from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'usera',
  'complete_profile() updated the caller''s own row'
);

select is(
  (select onboarding_completed_at is not null
     from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  true,
  'complete_profile() set onboarding_completed_at for the caller'
);

reset role;
reset request.jwt.claims;

-- Checked as an unrestricted role (not User A) - RLS would otherwise hide
-- User B's row from User A entirely and make this assertion meaningless.
select is(
  (select username from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'userb',
  'complete_profile() called as User A never touched User B''s row'
);

-- --- Username uniqueness is case-insensitive, including via the RPC ------
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select throws_ok(
  $$ select public.complete_profile('Bea', 'B', 'UserA', '1990-01-01'::date, null, null, null, null) $$,
  '23505',
  null,
  'complete_profile() enforces case-insensitive username uniqueness ("UserA" collides with "usera")'
);

reset role;
reset request.jwt.claims;

-- --- update_profile() refuses to null required fields once complete -----
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select throws_ok(
  $$ select public.update_profile(null, 'Lovelace', 'usera', '1990-01-01'::date, null, null, null, null) $$,
  'KO001',
  null,
  'update_profile() refuses to null first_name once onboarding is already complete'
);

select is(
  (select first_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Ada',
  'the rejected update_profile() call left first_name unchanged'
);

reset role;
reset request.jwt.claims;

-- --- is_username_available() never reveals ownership ----------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is(
  public.is_username_available('UserA'),
  false,
  'is_username_available() is case-insensitive and reports a taken username as unavailable'
);

select is(
  public.is_username_available('brand_new_name'),
  true,
  'is_username_available() reports a free username as available'
);

reset role;
reset request.jwt.claims;

-- --- Simulate anon ---------------------------------------------------------
set local role anon;

select throws_ok(
  $$ select count(*)::int from public.profiles $$,
  '42501',
  null,
  'anon has no SELECT privilege on public.profiles at all'
);

select throws_ok(
  $$ insert into public.profiles (id) values ('33333333-3333-3333-3333-333333333333') $$,
  '42501',
  null,
  'anon has no INSERT privilege on public.profiles'
);

reset role;

select * from finish();
rollback;
