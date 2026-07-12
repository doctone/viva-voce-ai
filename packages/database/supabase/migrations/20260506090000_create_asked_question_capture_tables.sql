-- Asked Questions: what the teacher actually asked during a Viva Session,
-- including unplanned follow-ups. Observations and Evidence Markers are
-- private assessment material captured against an Asked Question.

create table public.asked_questions (
  id uuid primary key default gen_random_uuid(),
  viva_session_id uuid not null references public.viva_sessions(id) on delete cascade,
  viva_question_id uuid references public.viva_questions(id) on delete set null,
  question_text text not null,
  is_unplanned boolean not null default false,
  asked_at timestamptz not null default now()
);

alter table public.asked_questions enable row level security;

create policy "authenticated users can read asked questions"
on public.asked_questions
for select
to authenticated
using (true);

create policy "authenticated users can insert asked questions"
on public.asked_questions
for insert
to authenticated
with check (true);

create index asked_questions_viva_session_id_idx
on public.asked_questions(viva_session_id);

-- A planned Viva Question can only be recorded as asked once per session.
-- Unplanned follow-ups (viva_question_id is null) have no such limit.
create unique index asked_questions_session_question_idx
on public.asked_questions(viva_session_id, viva_question_id)
where (viva_question_id is not null);

-- Observations: a private, timestamped teacher note against an Asked
-- Question. One row per Asked Question; saving again amends it in place.
create table public.observations (
  asked_question_id uuid primary key references public.asked_questions(id) on delete cascade,
  content text not null,
  teacher_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.observations enable row level security;

create policy "authenticated users can read observations"
on public.observations
for select
to authenticated
using (true);

create policy "teachers can insert their own observations"
on public.observations
for insert
to authenticated
with check (teacher_id = auth.uid());

create policy "teachers can amend their own observations"
on public.observations
for update
to authenticated
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid());

-- Evidence Markers: a neutral indication of clear understanding, a need for
-- further probing, or a concern. One row per Asked Question; applying a new
-- marker replaces the previous one.
create table public.evidence_markers (
  asked_question_id uuid primary key references public.asked_questions(id) on delete cascade,
  marker_type text not null check (
    marker_type in ('clear_understanding', 'needs_further_probing', 'concern')
  ),
  teacher_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.evidence_markers enable row level security;

create policy "authenticated users can read evidence markers"
on public.evidence_markers
for select
to authenticated
using (true);

create policy "teachers can insert their own evidence markers"
on public.evidence_markers
for insert
to authenticated
with check (teacher_id = auth.uid());

create policy "teachers can amend their own evidence markers"
on public.evidence_markers
for update
to authenticated
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid());
