-- Database security tests for the Tempo Livre (leisure) domain: RLS on
-- leisure_items, leisure_plan_entries, leisure_log_entries, leisure_notes,
-- leisure_collections and leisure_collection_items.
-- Run with: `supabase test db` (requires `supabase start`).
--
-- Proves, for every table:
--   * User A can read/write only their own rows.
--   * User A cannot read or mutate User B's rows (RLS matches 0 rows).
--   * anon has no privileges at all.
-- Plus:
--   * leisure_plan_entries.leisure_item_id survives the owning item's
--     deletion (ON DELETE SET NULL), instead of cascading.
--   * leisure_collection_items enforces the same per-user isolation as its
--     parent tables even though it's a plain junction table.

begin;
select plan(20);

create extension if not exists pgtap with schema extensions;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'user-a@example.test', '{}'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@example.test', '{}');

-- --- Seed one item/plan/log/note/collection for each user -----------------

insert into public.leisure_items (id, user_id, type, title, status, duration_type, details)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'movie', 'A''s Movie', 'backlog', 'fixed', '{"runtime": 120}'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'movie', 'B''s Movie', 'backlog', 'fixed', '{"runtime": 90}');

insert into public.leisure_plan_entries (id, user_id, leisure_item_id, title, date)
values
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'A plan', current_date),
  ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-0000-0000-0000-000000000001', 'B plan', current_date);

insert into public.leisure_log_entries (id, user_id, leisure_item_id, activity_type, title, completed_at)
values
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'movie', 'A watched it', now()),
  ('bbbbbbbb-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-0000-0000-0000-000000000001', 'movie', 'B watched it', now());

insert into public.leisure_notes (id, user_id, content, type)
values
  ('aaaaaaaa-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'A note', 'text'),
  ('bbbbbbbb-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'B note', 'text');

insert into public.leisure_collections (id, user_id, name)
values
  ('aaaaaaaa-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'A collection'),
  ('bbbbbbbb-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'B collection');

insert into public.leisure_collection_items (collection_id, item_id, user_id)
values
  ('aaaaaaaa-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222');

-- --- Simulate User A --------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select count(*)::int from public.leisure_items),
  1,
  'User A sees only their own leisure_items row'
);

select is(
  (select count(*)::int from public.leisure_plan_entries),
  1,
  'User A sees only their own leisure_plan_entries row'
);

select is(
  (select count(*)::int from public.leisure_log_entries),
  1,
  'User A sees only their own leisure_log_entries row'
);

select is(
  (select count(*)::int from public.leisure_notes),
  1,
  'User A sees only their own leisure_notes row'
);

select is(
  (select count(*)::int from public.leisure_collections),
  1,
  'User A sees only their own leisure_collections row'
);

select is(
  (select count(*)::int from public.leisure_collection_items),
  1,
  'User A sees only their own leisure_collection_items row'
);

-- User A attempts to mutate User B's rows - RLS must match 0 rows, not error.
update public.leisure_items set title = 'hijacked' where id = 'bbbbbbbb-0000-0000-0000-000000000001';
update public.leisure_plan_entries set title = 'hijacked' where id = 'bbbbbbbb-0000-0000-0000-000000000002';
update public.leisure_notes set content = 'hijacked' where id = 'bbbbbbbb-0000-0000-0000-000000000004';
update public.leisure_collections set name = 'hijacked' where id = 'bbbbbbbb-0000-0000-0000-000000000005';
delete from public.leisure_items where id = 'bbbbbbbb-0000-0000-0000-000000000001';

-- User A can insert their own row, but never on User B's behalf.
select throws_ok(
  $$ insert into public.leisure_items (user_id, type, title, duration_type, details)
     values ('22222222-2222-2222-2222-222222222222', 'book', 'spoofed', 'unknown', '{}') $$,
  '42501',
  null,
  'User A cannot insert a leisure_items row with User B''s user_id (with-check policy)'
);

reset role;
reset request.jwt.claims;

select is(
  (select title from public.leisure_items where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'B''s Movie',
  'User A''s UPDATE against User B''s leisure_items row silently affected 0 rows'
);

select is(
  (select title from public.leisure_plan_entries where id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  'B plan',
  'User A''s UPDATE against User B''s leisure_plan_entries row silently affected 0 rows'
);

select is(
  (select content from public.leisure_notes where id = 'bbbbbbbb-0000-0000-0000-000000000004'),
  'B note',
  'User A''s UPDATE against User B''s leisure_notes row silently affected 0 rows'
);

select is(
  (select name from public.leisure_collections where id = 'bbbbbbbb-0000-0000-0000-000000000005'),
  'B collection',
  'User A''s UPDATE against User B''s leisure_collections row silently affected 0 rows'
);

select is(
  (select count(*)::int from public.leisure_items where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  1,
  'User A''s DELETE against User B''s leisure_items row silently affected 0 rows'
);

-- --- ON DELETE SET NULL: deleting an item never cascades into plan/log ----
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

delete from public.leisure_items where id = 'aaaaaaaa-0000-0000-0000-000000000001';

select is(
  (select count(*)::int from public.leisure_items where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0,
  'User A deleted their own leisure_items row'
);

select is(
  (select leisure_item_id from public.leisure_plan_entries where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  null,
  'Deleting the item set leisure_plan_entries.leisure_item_id to NULL instead of deleting the plan entry'
);

select is(
  (select leisure_item_id from public.leisure_log_entries where id = 'aaaaaaaa-0000-0000-0000-000000000003'),
  null,
  'Deleting the item set leisure_log_entries.leisure_item_id to NULL instead of deleting the log entry'
);

select is(
  (select count(*)::int from public.leisure_collection_items where item_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0,
  'Deleting the item cascade-deleted its leisure_collection_items row (ON DELETE CASCADE)'
);

reset role;
reset request.jwt.claims;

-- --- Simulate anon -----------------------------------------------------------
set local role anon;

select throws_ok(
  $$ select count(*)::int from public.leisure_items $$,
  '42501',
  null,
  'anon has no SELECT privilege on public.leisure_items'
);

select throws_ok(
  $$ select count(*)::int from public.leisure_plan_entries $$,
  '42501',
  null,
  'anon has no SELECT privilege on public.leisure_plan_entries'
);

select throws_ok(
  $$ select count(*)::int from public.leisure_notes $$,
  '42501',
  null,
  'anon has no SELECT privilege on public.leisure_notes'
);

select throws_ok(
  $$ select count(*)::int from public.leisure_collections $$,
  '42501',
  null,
  'anon has no SELECT privilege on public.leisure_collections'
);

reset role;

select * from finish();
rollback;
