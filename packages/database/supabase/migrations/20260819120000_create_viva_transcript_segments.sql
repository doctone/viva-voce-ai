-- Text for one chunk of a Viva Recording.
--
-- Segments are keyed by the same `sequence` as `viva_recording_chunks`, so the
-- transcript reassembles in spoken order even though chunk uploads and their
-- transcription requests complete out of order. One row per chunk, never
-- appended to: re-transcribing a chunk replaces nothing, it is a no-op.
--
-- This is evidence, not judgment. A segment records what a transcription
-- service heard; it carries no interpretation of the answer.
create table public.viva_transcript_segments (
  id uuid primary key default gen_random_uuid(),
  viva_session_id uuid not null references public.viva_sessions(id) on delete cascade,
  sequence integer not null check (sequence >= 0),
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.viva_transcript_segments enable row level security;

create policy "authenticated users can read viva transcript segments"
on public.viva_transcript_segments
for select
to authenticated
using (true);

create policy "authenticated users can insert viva transcript segments"
on public.viva_transcript_segments
for insert
to authenticated
with check (true);

create index viva_transcript_segments_session_id_idx
on public.viva_transcript_segments(viva_session_id);

-- A retried transcription for the same chunk must not duplicate the text.
create unique index viva_transcript_segments_session_sequence_idx
on public.viva_transcript_segments(viva_session_id, sequence);
