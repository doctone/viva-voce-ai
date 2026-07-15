-- Recoverable, chunked audio capture for an active Viva Session (#59). Each
-- row is one MediaRecorder timeslice already durably stored in the private
-- submission-viva-audio bucket (secured in #55). Sequence lets a client (or
-- the recovery flow in #60) reconstruct the recording and detect gaps after
-- a refresh or crash without re-uploading or duplicating a chunk already
-- saved.
create table public.viva_recording_chunks (
  id uuid primary key default gen_random_uuid(),
  viva_session_id uuid not null references public.viva_sessions(id) on delete cascade,
  sequence integer not null check (sequence >= 0),
  storage_path text not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);

alter table public.viva_recording_chunks enable row level security;

create policy "authenticated users can read viva recording chunks"
on public.viva_recording_chunks
for select
to authenticated
using (true);

create policy "authenticated users can insert viva recording chunks"
on public.viva_recording_chunks
for insert
to authenticated
with check (true);

create index viva_recording_chunks_session_id_idx
on public.viva_recording_chunks(viva_session_id);

-- A retried upload for the same timeslice must not create a duplicate chunk row.
create unique index viva_recording_chunks_session_sequence_idx
on public.viva_recording_chunks(viva_session_id, sequence);
