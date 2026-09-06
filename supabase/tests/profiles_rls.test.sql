-- Database security tests for public.profiles RLS.
-- Run with: `supabase test db` (requires `supabase start`).
--
-- Proves:
--   * handle_new_user() creates a profile for each new auth user.
--   * User A can read their own profile.
--   * User A cannot read User B's profile.
--   * User A's UPDATE against User B's profile silently affects 0 rows.
--   * anon cannot select from profiles at all (no rows, no privilege).

begin;
select plan(6);

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

-- --- Simulate anon ---------------------------------------------------------
set local role anon;

select is(
  (select count(*)::int from public.profiles),
  0,
  'anon cannot select any profile'
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
