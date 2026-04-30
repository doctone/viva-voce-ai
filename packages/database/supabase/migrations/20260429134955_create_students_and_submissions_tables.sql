create table public.students (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  submission_title text not null,
  submission_text text not null,
  created_at timestamptz not null default now()
);

alter table public.students enable row level security;
alter table public.submissions enable row level security;

create policy "authenticated users can read students"
on public.students
for select
to authenticated
using (true);

create policy "authenticated users can read submissions"
on public.submissions
for select
to authenticated
using (true);

create index submissions_student_id_idx on public.submissions(student_id);
