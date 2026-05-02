alter table public.submission_questions rename to viva_questions;

alter index if exists public.submission_questions_submission_id_idx
  rename to viva_questions_submission_id_idx;

alter table public.viva_questions
  add column if not exists is_recommended boolean not null default false,
  add column if not exists sort_order integer not null default 0;

drop policy if exists "authenticated users can read submission questions"
on public.viva_questions;

drop policy if exists "authenticated users can insert submission questions"
on public.viva_questions;

create policy "authenticated users can read viva questions"
on public.viva_questions
for select
to authenticated
using (true);

create policy "authenticated users can insert viva questions"
on public.viva_questions
for insert
to authenticated
with check (true);

create policy "authenticated users can delete viva questions"
on public.viva_questions
for delete
to authenticated
using (true);

update public.viva_questions
set category = case
  when lower(category) in ('comprehension') or lower(category) like 'concept:%' then 'comprehension_and_accuracy'
  when lower(category) in ('critical analysis') or lower(category) like 'argument:%' then 'argumentation_and_reasoning'
  when lower(category) = 'ownership' then 'authenticity_and_ownership'
  else category
end;
