-- Asynchronous transcription of a completed Viva Recording (#63).
--
-- One job per recording. Its status is the visible lifecycle (queued ->
-- processing -> completed | failed); a failed job can be re-queued and retried.
-- Transcription is supporting material for review: a failed or missing job
-- never blocks the teacher from reviewing and concluding.
create table public.viva_recording_transcription_jobs (
  id uuid primary key default gen_random_uuid(),
  submission_viva_id uuid not null unique references public.submission_viva(id) on delete cascade,
  teacher_id uuid not null default auth.uid() references auth.users(id),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  error_message text,
  duration_seconds double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Timed text for the recording. `confidence` is the transcription service's own
-- estimate (0-1); it is evidence about the audio, never about the student.
create table public.viva_recording_transcript_segments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.viva_recording_transcription_jobs(id) on delete cascade,
  position integer not null check (position >= 0),
  start_seconds double precision not null check (start_seconds >= 0),
  end_seconds double precision not null check (end_seconds >= start_seconds),
  text text not null,
  confidence double precision check (confidence is null or (confidence >= 0 and confidence <= 1)),
  unique (job_id, position)
);

alter table public.viva_recording_transcription_jobs enable row level security;
alter table public.viva_recording_transcript_segments enable row level security;

create policy "teachers can read their transcription jobs"
on public.viva_recording_transcription_jobs
for select to authenticated
using (teacher_id = auth.uid());

create policy "teachers can queue their transcription jobs"
on public.viva_recording_transcription_jobs
for insert to authenticated
with check (teacher_id = auth.uid());

create policy "teachers can update their transcription jobs"
on public.viva_recording_transcription_jobs
for update to authenticated
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid());

create policy "teachers can read their transcript segments"
on public.viva_recording_transcript_segments
for select to authenticated
using (exists (
  select 1 from public.viva_recording_transcription_jobs job
  where job.id = job_id and job.teacher_id = auth.uid()
));

create policy "teachers can write their transcript segments"
on public.viva_recording_transcript_segments
for insert to authenticated
with check (exists (
  select 1 from public.viva_recording_transcription_jobs job
  where job.id = job_id and job.teacher_id = auth.uid()
));

create policy "teachers can replace their transcript segments"
on public.viva_recording_transcript_segments
for delete to authenticated
using (exists (
  select 1 from public.viva_recording_transcription_jobs job
  where job.id = job_id and job.teacher_id = auth.uid()
));
