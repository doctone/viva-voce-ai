-- Who said what inside one transcribed chunk (#93).
--
-- A child of the chunk text in `viva_transcript_segments`: that row stays the
-- plain-text source of truth, so sessions transcribed before diarization (and
-- chunks where diarization failed) keep working and simply have no utterances,
-- which readers treat as speaker `unknown`.
--
-- Offsets are milliseconds from the start of the whole recording, not the
-- chunk, so utterances from different chunks sort on one timeline.
-- `speaker` is `unknown` whenever attribution was not confident enough; it is
-- never defaulted to `student`. `speaker_source` separates what the model
-- inferred from what a teacher later corrected.
create table public.viva_transcript_utterances (
  id uuid primary key default gen_random_uuid(),
  viva_session_id uuid not null references public.viva_sessions(id) on delete cascade,
  sequence integer not null check (sequence >= 0),
  position integer not null check (position >= 0),
  speaker text not null default 'unknown'
    check (speaker in ('teacher', 'student', 'unknown')),
  speaker_source text not null default 'model'
    check (speaker_source in ('model', 'teacher')),
  start_ms integer not null check (start_ms >= 0),
  end_ms integer not null,
  confidence double precision not null default 0
    check (confidence >= 0 and confidence <= 1),
  text text not null,
  created_at timestamptz not null default now(),
  constraint viva_transcript_utterances_span_check check (end_ms >= start_ms)
);

alter table public.viva_transcript_utterances enable row level security;

create policy "authenticated users can read viva transcript utterances"
on public.viva_transcript_utterances
for select
to authenticated
using (true);

create policy "authenticated users can insert viva transcript utterances"
on public.viva_transcript_utterances
for insert
to authenticated
with check (true);

create index viva_transcript_utterances_timeline_idx
on public.viva_transcript_utterances(viva_session_id, start_ms);

-- Re-transcribing a chunk must not duplicate its utterances.
create unique index viva_transcript_utterances_chunk_position_idx
on public.viva_transcript_utterances(viva_session_id, sequence, position);
