-- Viva recordings were previously exposed through durable public URLs. Normalize
-- any existing public-style URLs down to bare storage object paths so the
-- underlying recordings keep resolving once the bucket is switched to private
-- (the recording objects themselves are untouched -- only the stored reference
-- format changes, so no evidence is lost).
update public.submission_viva
set audio_url = regexp_replace(
  audio_url,
  '^.*/storage/v1/object/public/submission-viva-audio/',
  ''
)
where audio_url ~ '/storage/v1/object/public/submission-viva-audio/';

alter table public.submission_viva rename column audio_url to audio_path;

-- Force the storage bucket private (creating it if it does not already exist,
-- since it was previously only ever provisioned ad hoc via seed.sql).
insert into storage.buckets (id, name, public)
values ('submission-viva-audio', 'submission-viva-audio', false)
on conflict (id) do update
set public = false;

drop policy if exists "authenticated users can upload submission viva audio" on storage.objects;
drop policy if exists "authenticated users can read submission viva audio" on storage.objects;

create policy "authenticated users can upload submission viva audio"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'submission-viva-audio');

create policy "authenticated users can read submission viva audio"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'submission-viva-audio');
