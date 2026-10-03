-- Amendments: a signed Viva Record is never edited. A teacher corrects it by
-- appending a versioned, attributable amendment; the original stays intact.

create table public.viva_record_amendments (
  id uuid primary key default gen_random_uuid(),
  viva_record_id uuid not null references public.viva_records(id) on delete restrict,
  version integer not null check (version > 0),
  author_id uuid not null default auth.uid() references auth.users(id),
  reason text not null check (length(trim(reason)) > 0),
  -- [{ "field": "conclusion" | "conclusionRationale" | "followUpAction", "from": ..., "to": ... }]
  changes jsonb not null check (jsonb_typeof(changes) = 'array' and jsonb_array_length(changes) > 0),
  conclusion text not null check (
    conclusion in (
      'understanding_demonstrated',
      'further_review_required',
      'authenticity_concern',
      'unable_to_conclude'
    )
  ),
  conclusion_rationale text not null check (length(trim(conclusion_rationale)) > 0),
  follow_up_action text not null default '',
  created_at timestamptz not null default now(),
  unique (viva_record_id, version)
);

alter table public.viva_record_amendments enable row level security;

create policy "teachers can read amendments to their viva records"
on public.viva_record_amendments
for select
to authenticated
using (exists (
  select 1 from public.viva_records r
  where r.id = viva_record_id and r.teacher_id = auth.uid()
));

create policy "teachers can amend their signed viva records"
on public.viva_record_amendments
for insert
to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.viva_records r
    where r.id = viva_record_id and r.teacher_id = auth.uid() and r.status = 'signed'
  )
);

-- Append-only, and versions must be consecutive so two teachers' concurrent
-- amendments cannot both succeed against the same base version.
create function public.viva_record_amendments_guard()
returns trigger
language plpgsql
as $$
declare
  latest integer;
begin
  if tg_op <> 'INSERT' then
    raise exception 'Viva Record amendments cannot be changed or deleted.'
      using errcode = 'check_violation';
  end if;

  perform 1 from public.viva_records where id = new.viva_record_id for update;

  select coalesce(max(version), 0) into latest
  from public.viva_record_amendments where viva_record_id = new.viva_record_id;

  if new.version <> latest + 1 then
    raise exception 'This Viva Record was amended by someone else.'
      using errcode = 'serialization_failure';
  end if;

  return new;
end;
$$;

create trigger viva_record_amendments_guard
before insert or update or delete on public.viva_record_amendments
for each row execute function public.viva_record_amendments_guard();
