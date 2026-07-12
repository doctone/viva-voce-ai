create table public.viva_question_sets (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'ready')),
  ready_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id)
);

alter table public.viva_question_sets enable row level security;

create policy "authenticated users can read viva question sets"
on public.viva_question_sets
for select
to authenticated
using (true);

create policy "authenticated users can insert viva question sets"
on public.viva_question_sets
for insert
to authenticated
with check (true);

create policy "authenticated users can update viva question sets"
on public.viva_question_sets
for update
to authenticated
using (true)
with check (true);

create index viva_question_sets_submission_id_idx
on public.viva_question_sets(submission_id);
