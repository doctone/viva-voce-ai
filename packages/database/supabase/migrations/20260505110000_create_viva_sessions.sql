create table public.viva_sessions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  viva_question_set_id uuid not null references public.viva_question_sets(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'ended')),
  consent_state text not null check (consent_state in ('consent_given', 'recording_disabled')),
  consent_declined_reason text,
  equipment_check_result text not null check (equipment_check_result in ('passed', 'failed')),
  expected_duration_minutes integer not null check (expected_duration_minutes > 0),
  accessibility_adjustments text not null default '',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint viva_sessions_consent_reason_required check (
    consent_state = 'consent_given'
    or (
      consent_state = 'recording_disabled'
      and consent_declined_reason is not null
      and length(trim(consent_declined_reason)) > 0
    )
  )
);

alter table public.viva_sessions enable row level security;

create policy "authenticated users can read viva sessions"
on public.viva_sessions
for select
to authenticated
using (true);

create policy "authenticated users can insert viva sessions"
on public.viva_sessions
for insert
to authenticated
with check (true);

create policy "authenticated users can update viva sessions"
on public.viva_sessions
for update
to authenticated
using (true)
with check (true);

create index viva_sessions_submission_id_idx
on public.viva_sessions(submission_id);

create index viva_sessions_question_set_id_idx
on public.viva_sessions(viva_question_set_id);

-- Enforces "exactly one active Viva Session" per question set, even under concurrent requests.
create unique index viva_sessions_one_active_per_question_set_idx
on public.viva_sessions(viva_question_set_id)
where (status = 'active');
