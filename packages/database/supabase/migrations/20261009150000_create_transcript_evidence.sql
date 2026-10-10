-- Transcript evidence for Asked Questions (#64).
--
-- An excerpt of the recording transcript that supports an Asked Question
-- (a `thread_entries` row of kind 'asked'). Every row cites both the Asked
-- Question and the transcript segment it quotes.
--
-- `origin` keeps system suggestions distinct from teacher-authored evidence:
-- a suggestion starts `pending` and the teacher accepts, amends or rejects it;
-- a teacher-added excerpt is `accepted` from the start. `suggested_excerpt`
-- preserves what the system proposed after the teacher amends `excerpt`.
create table public.viva_transcript_evidence (
  id uuid primary key default gen_random_uuid(),
  asked_entry_id uuid not null references public.thread_entries(id) on delete cascade,
  segment_id uuid not null references public.viva_recording_transcript_segments(id) on delete cascade,
  teacher_id uuid not null default auth.uid() references auth.users(id),
  origin text not null check (origin in ('suggested', 'teacher')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'amended', 'rejected')),
  excerpt text not null check (btrim(excerpt) <> ''),
  suggested_excerpt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint viva_transcript_evidence_origin_check check (
    (origin = 'suggested' and suggested_excerpt is not null)
    or (origin = 'teacher' and suggested_excerpt is null and status = 'accepted')
  )
);

-- One suggestion per segment per Asked Question, so re-running suggestion
-- never resurrects an excerpt the teacher already rejected.
create unique index viva_transcript_evidence_suggestion_idx
on public.viva_transcript_evidence(asked_entry_id, segment_id)
where origin = 'suggested';

create index viva_transcript_evidence_asked_idx
on public.viva_transcript_evidence(asked_entry_id);

alter table public.viva_transcript_evidence enable row level security;

create policy "teachers can read their transcript evidence"
on public.viva_transcript_evidence
for select to authenticated
using (teacher_id = auth.uid());

create policy "teachers can add their transcript evidence"
on public.viva_transcript_evidence
for insert to authenticated
with check (teacher_id = auth.uid());

create policy "teachers can review their transcript evidence"
on public.viva_transcript_evidence
for update to authenticated
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid());
