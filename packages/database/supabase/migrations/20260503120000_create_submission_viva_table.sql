create table if not exists public.submission_viva (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  audio_url text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

alter table public.submission_viva enable row level security;

create policy "Authenticated users can select submission viva"
  on public.submission_viva
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert submission viva"
  on public.submission_viva
  for insert
  to authenticated
  with check (true);
