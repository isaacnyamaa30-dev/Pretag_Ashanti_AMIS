-- PRETAG AMIS - 0003_storage.sql
-- Access control for the private `r20` bucket that holds original uploaded files.
-- Only staff (admins, executives, data officers) may read or write; the bucket
-- itself is not public.

begin;

create policy "r20 staff read" on storage.objects
  for select to authenticated
  using (bucket_id = 'r20' and app_is_staff());

create policy "r20 staff write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'r20' and app_is_staff());

create policy "r20 staff update" on storage.objects
  for update to authenticated
  using (bucket_id = 'r20' and app_is_staff());

commit;
