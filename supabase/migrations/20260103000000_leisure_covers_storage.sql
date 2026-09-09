-- Public "leisure-covers" Storage bucket for leisure_items.cover_image.
--
-- Unlike avatars (private, resolved to a short-lived signed URL at read
-- time - see 20260101000004_avatars_storage.sql), this bucket is public:
-- a cover is low-sensitivity data (a movie poster, a book cover, a photo
-- of a place) and leisure_items is read as *lists* of many items, where
-- resolving one signed URL per item per request would mean N extra
-- Storage calls just to render a grid. Storing the object's stable public
-- URL directly in cover_image (no separate "path" column, no per-read
-- resolution) keeps list reads a single query, matching every other
-- leisure endpoint's "no unnecessary work per screen" design.
--
-- Every object path is namespaced "<auth.uid()>/<file>", same isolation
-- model as avatars: a user may only write into their own folder. Reading
-- an individual object still goes through RLS for authenticated/anon
-- Storage API calls (list/download); the public URL itself bypasses RLS
-- entirely, which is what "public bucket" means.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'leisure-covers',
  'leisure-covers',
  true,
  5242880, -- 5 MiB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "leisure_covers_select_public" on storage.objects;
create policy "leisure_covers_select_public"
  on storage.objects
  for select
  to public
  using (bucket_id = 'leisure-covers');

drop policy if exists "leisure_covers_insert_own" on storage.objects;
create policy "leisure_covers_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'leisure-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "leisure_covers_update_own" on storage.objects;
create policy "leisure_covers_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'leisure-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'leisure-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "leisure_covers_delete_own" on storage.objects;
create policy "leisure_covers_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'leisure-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
