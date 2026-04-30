create table public.submission_questions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  category text not null,
  question_text text not null,
  teacher_note text not null,
  created_at timestamptz not null default now()
);

alter table public.submission_questions enable row level security;

create policy "authenticated users can read submission questions"
on public.submission_questions
for select
to authenticated
using (true);

create policy "authenticated users can insert submission questions"
on public.submission_questions
for insert
to authenticated
with check (true);

create index submission_questions_submission_id_idx
on public.submission_questions(submission_id, created_at);
