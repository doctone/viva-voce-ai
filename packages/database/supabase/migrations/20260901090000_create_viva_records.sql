-- Viva Records: the teacher's explicit Viva Conclusion for a Viva Session and,
-- once signed, the frozen account of what was asked and observed. Ending a
-- Viva Session never creates a signed record; signing is a separate act.

create table public.viva_records (
  id uuid primary key default gen_random_uuid(),
  viva_session_id uuid not null unique references public.viva_sessions(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'signed')),
  conclusion text check (
    conclusion in (
      'understanding_demonstrated',
      'further_review_required',
      'authenticity_concern',
      'unable_to_conclude'
    )
  ),
  conclusion_rationale text not null default '',
  follow_up_action text not null default '',
  teacher_id uuid not null default auth.uid() references auth.users(id),
  signed_at timestamptz,
  snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint viva_records_signed_is_complete check (
    status = 'draft'
    or (
      conclusion is not null
      and length(trim(conclusion_rationale)) > 0
      and signed_at is not null
      and snapshot is not null
    )
  )
);

alter table public.viva_records enable row level security;

create policy "teachers can read their viva records"
on public.viva_records
for select
to authenticated
using (teacher_id = auth.uid());

create policy "teachers can create their viva records"
on public.viva_records
for insert
to authenticated
with check (teacher_id = auth.uid());

create policy "teachers can update their draft viva records"
on public.viva_records
for update
to authenticated
using (teacher_id = auth.uid() and status = 'draft')
with check (teacher_id = auth.uid());

-- A signed Viva Record can never be edited or deleted, whoever asks.
create function public.viva_records_protect_signed()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'signed' then
    raise exception 'A signed Viva Record cannot be changed.'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if new.viva_session_id <> old.viva_session_id or new.teacher_id <> old.teacher_id then
    raise exception 'A Viva Record cannot be moved to another session or teacher.'
      using errcode = 'check_violation';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

create trigger viva_records_protect_signed
before update or delete on public.viva_records
for each row execute function public.viva_records_protect_signed();

-- A record may only be created for a Viva Session that has ended.
create function public.viva_records_require_ended_session()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.viva_sessions
    where id = new.viva_session_id and status = 'ended'
  ) then
    raise exception 'A Viva Record needs an ended Viva Session.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger viva_records_require_ended_session
before insert on public.viva_records
for each row execute function public.viva_records_require_ended_session();

-- Evidence cannot be amended behind a signature: once a session's record is
-- signed, its Asked Questions, Observations and Evidence Markers are frozen.
create function public.protect_signed_viva_evidence()
returns trigger
language plpgsql
as $$
declare
  target_session uuid;
begin
  if tg_table_name = 'asked_questions' then
    target_session := coalesce(old.viva_session_id, new.viva_session_id);
  else
    select viva_session_id into target_session
    from public.asked_questions
    where id = coalesce(old.asked_question_id, new.asked_question_id);
  end if;

  if exists (
    select 1 from public.viva_records
    where viva_session_id = target_session and status = 'signed'
  ) then
    raise exception 'This Viva Record is signed; its evidence cannot be changed.'
      using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger protect_signed_asked_questions
before insert or update or delete on public.asked_questions
for each row execute function public.protect_signed_viva_evidence();

create trigger protect_signed_observations
before insert or update or delete on public.observations
for each row execute function public.protect_signed_viva_evidence();

create trigger protect_signed_evidence_markers
before insert or update or delete on public.evidence_markers
for each row execute function public.protect_signed_viva_evidence();
