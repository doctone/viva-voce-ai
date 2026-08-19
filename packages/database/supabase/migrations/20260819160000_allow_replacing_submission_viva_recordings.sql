-- A submission keeps one recording, so saving a new one replaces what was
-- there. Both halves of that replacement were previously denied by RLS: the
-- table had only insert and select policies, and the storage bucket the same.
-- PostgREST reports a denied delete as a successful no-op, so the replacement
-- appeared to work while every earlier recording stayed exactly where it was.

create policy "authenticated users can delete submission viva"
on public.submission_viva
for delete
to authenticated
using (true);

create policy "authenticated users can delete submission viva audio"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'submission-viva-audio');
