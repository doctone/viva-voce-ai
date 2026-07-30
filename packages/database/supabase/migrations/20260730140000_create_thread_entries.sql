-- Collapse the split between a viva question and what happened to it.
--
-- `viva_questions` and `asked_questions` are one concept the schema separated:
-- a Thread is a question about the work plus everything ever attached to it.
-- Teacher notes, asked-at, observations and evidence markers become one
-- annotation stream (`thread_entries`) discriminated by kind, so a new kind of
-- annotation is a union member rather than a new table, panel and tab.
--
-- This migration is the EXPAND half of an expand/contract pair. It is additive:
-- `asked_questions`, `observations` and `evidence_markers` are left in place and
-- still work, so the running application is unaffected until reads are moved
-- over. A later contract migration drops them.

-- ---------------------------------------------------------------------------
-- 1. Threads
-- ---------------------------------------------------------------------------

alter table public.viva_questions
  add column if not exists origin text not null default 'generated'
    check (origin in ('generated', 'authored', 'live')),
  -- Set only for origin = 'live': a follow-up raised during a specific session.
  add column if not exists viva_session_id uuid
    references public.viva_sessions(id) on delete cascade,
  -- Traceability back to the pre-migration row a live thread was built from.
  add column if not exists legacy_asked_question_id uuid;

-- Passage anchoring. Dormant: every column stays null until the generator
-- returns verified spans and `submissions.submission_text` is made immutable.
-- Reserved now so the anchoring layer lands additively rather than as a rewrite.
alter table public.viva_questions
  add column if not exists anchor_kind text
    check (anchor_kind is null or anchor_kind in ('passage', 'section', 'whole_work')),
  add column if not exists anchor_start integer,
  add column if not exists anchor_end integer,
  add column if not exists anchor_quote text,
  add column if not exists anchor_prefix text,
  add column if not exists anchor_suffix text,
  add column if not exists anchor_text_hash text,
  add column if not exists anchor_status text
    check (anchor_status is null or anchor_status in ('resolved', 'repaired', 'orphaned'));

alter table public.viva_questions
  drop constraint if exists viva_questions_live_requires_session;

alter table public.viva_questions
  add constraint viva_questions_live_requires_session check (
    (origin = 'live' and viva_session_id is not null)
    or (origin <> 'live' and viva_session_id is null)
  );

create index if not exists viva_questions_origin_idx
  on public.viva_questions(submission_id, origin);

create index if not exists viva_questions_session_idx
  on public.viva_questions(viva_session_id)
  where (viva_session_id is not null);

-- ---------------------------------------------------------------------------
-- 2. The annotation stream
-- ---------------------------------------------------------------------------

create table if not exists public.thread_entries (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.viva_questions(id) on delete cascade,
  -- Null for notes written while preparing, before any session exists.
  viva_session_id uuid references public.viva_sessions(id) on delete cascade,
  kind text not null check (kind in ('note', 'asked', 'observation', 'marker')),
  author_id uuid not null default auth.uid() references auth.users(id),
  -- Payload. Which columns are required is enforced per kind below.
  text text,
  marker_type text check (
    marker_type is null
    or marker_type in ('clear_understanding', 'needs_further_probing', 'concern')
  ),
  elapsed_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint thread_entries_payload_matches_kind check (
    (kind = 'note'        and text is not null and marker_type is null)
    or (kind = 'asked'       and marker_type is null)
    or (kind = 'observation' and text is not null and marker_type is null)
    or (kind = 'marker'      and marker_type is not null)
  ),

  -- Everything except a preparation note belongs to a session.
  constraint thread_entries_session_required check (
    kind = 'note' or viva_session_id is not null
  )
);

alter table public.thread_entries enable row level security;

create policy "authenticated users can read thread entries"
on public.thread_entries
for select
to authenticated
using (true);

create policy "teachers can insert their own thread entries"
on public.thread_entries
for insert
to authenticated
with check (author_id = auth.uid());

create policy "teachers can amend their own thread entries"
on public.thread_entries
for update
to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());

create index if not exists thread_entries_thread_idx
  on public.thread_entries(thread_id, created_at);

create index if not exists thread_entries_session_idx
  on public.thread_entries(viva_session_id, created_at)
  where (viva_session_id is not null);

-- A thread is asked at most once per session, carries at most one observation,
-- and at most one marker — matching the pre-migration primary keys. Amending
-- updates in place; it never appends a second row.
create unique index if not exists thread_entries_one_per_kind_idx
  on public.thread_entries(thread_id, viva_session_id, kind)
  where (kind in ('asked', 'observation', 'marker'));

-- ---------------------------------------------------------------------------
-- 3. Backfill
-- ---------------------------------------------------------------------------

-- 3a. Unplanned follow-ups become real threads, so "a question that was asked"
--     has one representation regardless of when it was raised.
insert into public.viva_questions (
  submission_id,
  category,
  question_text,
  teacher_note,
  origin,
  viva_session_id,
  set_position,
  is_recommended,
  sort_order,
  created_at,
  legacy_asked_question_id
)
select
  session.submission_id,
  'follow_up',
  asked.question_text,
  '',
  'live',
  asked.viva_session_id,
  null,
  false,
  0,
  asked.asked_at,
  asked.id
from public.asked_questions asked
join public.viva_sessions session on session.id = asked.viva_session_id
where asked.viva_question_id is null
  and not exists (
    select 1
    from public.viva_questions existing
    where existing.legacy_asked_question_id = asked.id
  );

-- 3b. Asked entries, for planned questions and backfilled live threads alike.
insert into public.thread_entries (
  thread_id, viva_session_id, kind, author_id, elapsed_seconds, created_at, updated_at
)
select
  coalesce(asked.viva_question_id, live.id),
  asked.viva_session_id,
  'asked',
  coalesce(observation.teacher_id, marker.teacher_id, session_author.author_id),
  greatest(0, floor(extract(epoch from (asked.asked_at - session.started_at)))::integer),
  asked.asked_at,
  asked.asked_at
from public.asked_questions asked
join public.viva_sessions session on session.id = asked.viva_session_id
left join public.viva_questions live on live.legacy_asked_question_id = asked.id
left join public.observations observation on observation.asked_question_id = asked.id
left join public.evidence_markers marker on marker.asked_question_id = asked.id
cross join lateral (
  select coalesce(
    (select o.teacher_id from public.observations o where o.asked_question_id = asked.id),
    (select m.teacher_id from public.evidence_markers m where m.asked_question_id = asked.id),
    (select u.id from auth.users u order by u.created_at limit 1)
  ) as author_id
) as session_author
where coalesce(asked.viva_question_id, live.id) is not null
on conflict do nothing;

-- 3c. Observations.
insert into public.thread_entries (
  thread_id, viva_session_id, kind, author_id, text, created_at, updated_at
)
select
  coalesce(asked.viva_question_id, live.id),
  asked.viva_session_id,
  'observation',
  observation.teacher_id,
  observation.content,
  observation.created_at,
  observation.updated_at
from public.observations observation
join public.asked_questions asked on asked.id = observation.asked_question_id
left join public.viva_questions live on live.legacy_asked_question_id = asked.id
where coalesce(asked.viva_question_id, live.id) is not null
on conflict do nothing;

-- 3d. Evidence markers.
insert into public.thread_entries (
  thread_id, viva_session_id, kind, author_id, marker_type, created_at, updated_at
)
select
  coalesce(asked.viva_question_id, live.id),
  asked.viva_session_id,
  'marker',
  marker.teacher_id,
  marker.marker_type,
  marker.created_at,
  marker.updated_at
from public.evidence_markers marker
join public.asked_questions asked on asked.id = marker.asked_question_id
left join public.viva_questions live on live.legacy_asked_question_id = asked.id
where coalesce(asked.viva_question_id, live.id) is not null
on conflict do nothing;

-- 3e. Generated teacher notes become note entries. `viva_questions.teacher_note`
--     is deliberately left in place and still authoritative for reads; the
--     contract migration drops it once the application reads notes from here.
insert into public.thread_entries (
  thread_id, viva_session_id, kind, author_id, text, created_at, updated_at
)
select
  question.id,
  null,
  'note',
  (select u.id from auth.users u order by u.created_at limit 1),
  question.teacher_note,
  question.created_at,
  question.created_at
from public.viva_questions question
where length(trim(coalesce(question.teacher_note, ''))) > 0
  and not exists (
    select 1
    from public.thread_entries entry
    where entry.thread_id = question.id
      and entry.kind = 'note'
  )
  and exists (select 1 from auth.users);
