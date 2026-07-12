alter table public.viva_questions
  add column if not exists set_position integer;

create index if not exists viva_questions_set_position_idx
on public.viva_questions(submission_id, set_position);
