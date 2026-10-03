-- Viva Records (#61): the signed account of a completed Viva Session.
--
-- Ending a Viva Session never creates or decides a record. A teacher reviews
-- their evidence, chooses a Viva Conclusion, explains it and signs. Signing
-- inserts one row holding a snapshot of everything the record rests on, so
-- later edits to the live tables cannot silently change what was signed.
-- Corrections are an amendment feature (#62), not an UPDATE here.

create table public.viva_records (
  id uuid primary key default gen_random_uuid(),
  viva_session_id uuid not null unique references public.viva_sessions(id) on delete restrict,
  submission_id uuid not null references public.submissions(id) on delete restrict,
  conclusion text not null check (
    conclusion in (
      'understanding_demonstrated',
      'further_review_required',
      'authenticity_concern',
      'unable_to_conclude'
    )
  ),
  conclusion_explanation text not null check (length(trim(conclusion_explanation)) > 0),
  follow_up_action text,
  -- Question set, Asked Questions, Observations, Evidence Markers and the
  -- recording reference as they stood at signing.
  snapshot jsonb not null,
  signed_by uuid not null default auth.uid() references auth.users(id),
  signed_at timestamptz not null default now()
);

alter table public.viva_records enable row level security;

create policy "authenticated users can read viva records"
on public.viva_records
for select
to authenticated
using (true);

create policy "teachers can sign their own viva records"
on public.viva_records
for insert
to authenticated
with check (signed_by = auth.uid());

-- No update or delete policy exists, so RLS already refuses both. The trigger
-- keeps that true for roles that bypass RLS, and also refuses to sign a
-- session the teacher has not ended.
create function public.guard_viva_records()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if not exists (
      select 1
      from public.viva_sessions session
      where session.id = new.viva_session_id
        and session.status = 'ended'
    ) then
      raise exception 'A Viva Record can only be signed for an ended Viva Session.';
    end if;

    return new;
  end if;

  raise exception 'A signed Viva Record cannot be changed.';
end;
$$;

create trigger viva_records_guard
before insert or update or delete on public.viva_records
for each row execute function public.guard_viva_records();

create index viva_records_submission_id_idx
on public.viva_records(submission_id);
