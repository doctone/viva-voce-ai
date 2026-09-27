---
name: verify-viva-voce
description: Launch the Viva Voce AI web app (TanStack Start + local Supabase) and drive it in a headless browser the way a teacher does, capturing screenshots, ARIA snapshots and database rows as proof. Use when you need to confirm a UI change or user-facing behavior works in the running app, not just in Vitest.
---

# Verify Viva Voce AI

The user-facing surface is the web app in `apps/web`: a teacher logs in, lists submissions, creates one, reviews and edits generated viva questions, and records or uploads the viva audio. There is no CLI or public API. Data lives in the local Supabase stack from `packages/database`.

Everything goes through one helper, run from the repo root:

```bash
.claude/skills/verify-viva-voce/scripts/verify.sh <up|doctor|login|ab|shot|sql|down>
```

Shell state does not persist between your commands, so the helper remembers the active run in `.verify/current`. Every subcommand after `up` uses that run. To use a different one, set `VERIFY_RUN_ID=<id>`.

## Launch

```bash
.claude/skills/verify-viva-voce/scripts/verify.sh up
```

- Refuses to start unless `apps/web/.env` has `SUPABASE_URL=http://127.0.0.1:54321`. It will not drive a remote Supabase project.
- Starts local Supabase if it is not already running. If `supabase start` fails because a crashed stack left exited containers behind, it runs `supabase stop` (the data volume is kept) and retries once.
- Starts the dev server with `vite dev --port 3100 --strictPort` in its own process group. Use `VERIFY_PORT=<port>` to pick another port. It refuses a port that is already in use.
- Ready means it prints `READY run=<id> url=http://localhost:<port> evidence=<dir>`. The first request compiles the app, so this can take up to a minute.
- The dev server listens on `localhost` (IPv6 `::1`) only, so `http://127.0.0.1:<port>` does not connect. Always use `http://localhost:<port>`.
- Launch output and the dev server log go to `.verify/<run-id>/` (`vite.log`, `supabase-start.log`).

Teardown is `verify.sh down`, described under Cleanup below.

## Doctor

```bash
.claude/skills/verify-viva-voce/scripts/verify.sh doctor
```

This is read-only. It prints the run, URL, browser session, git build and branch, then an `OK`/`FAIL` line for each of these checks:

- the dev server process group is alive
- the port is owned by this run's process group, not by the user's own `pnpm dev`
- `/login` returns 200
- `.env` points at local Supabase
- Supabase auth is healthy
- the seed user exists

Finally it prints row counts for students and submissions. It exits non-zero if any check fails. Run it first, and again whenever something looks wrong.

## Isolation

- **Dev servers:** two runs can serve side by side on different ports (`VERIFY_PORT=3101 verify.sh up`).
- **Database:** there is only one local Supabase stack per machine (fixed ports 54321/54322, project `viva-voce-ai`). Every run and the user's own `pnpm dev` share the same database. Tag anything you create, for example with a `[verify <run-id>]` prefix, and delete exactly those rows afterwards.
- **User's session:** never drive a dev server this run did not start, and never run `supabase db reset` or `supabase stop` on a stack the user was already using.

## Drive

The harness is [`agent-browser`](https://github.com/vercel-labs/agent-browser). It is headless and uses its own browser profile. `verify.sh ab <args>` runs `agent-browser --session vv-<run-id> <args>`, so each run gets separate cookies. Always go through `verify.sh ab`, never call `agent-browser` bare.

```bash
V=.claude/skills/verify-viva-voce/scripts/verify.sh
$V login                                             # seed teacher will@viva-voce.org / password-will → /submissions
$V ab open http://localhost:3100/submissions
$V ab wait --text "5 submissions"                    # wait for data, not just the route
$V ab snapshot -i -c                                 # interactive elements with @refs
$V ab find role link click --name "New Submission"
$V ab fill "#title" "[verify 20260927-1200] Essay"   # form fields have stable ids
$V ab wait --fn "location.pathname.startsWith('/submissions/')"
```

Handles, most stable first:

1. Element ids on form fields: `#email`, `#password`, `#studentId`, `#title`, `#submissionText`, `#manual-question-category`, `#manual-question-text`, `#manual-question-teacher-note`, `#submissionVivaUpload`.
2. `aria-label`s:
   - `table[aria-label="Submissions"]`
   - `[aria-label="Filter submissions by status"]`
   - `Edit question: <question text>`
   - `Move question <n> up` / `Move question <n> down`
   - `Remove question <n> from the set`
   - `Upload viva audio`
3. Role plus the name as written in the source, e.g. `find role button click --name "Save question"`.

Routes: `/login`, `/signup`, `/logout`, `/submissions`, `/submissions/new`, `/submissions/<uuid>`, `/student-records`.

Driving rules that are easy to trip over:

- **Case of names and text.** Buttons, eyebrows and section headings use CSS `text-transform: uppercase`, and the two kinds of lookup treat that differently:
  - `find ... --name` matches the text as written in the source: `find role button click --name "Save question"`.
  - `wait --text` matches the rendered text, which is upper case: `wait --text "ADD MANUAL QUESTION"`.

  Snapshots print the upper-case version (`button "SAVE QUESTION"`). Copy the names you need from the feature map.
- **Hydration.** A form clicked before React hydrates does a native GET, and for login that puts the password in the URL. `verify.sh login` already waits for hydration. On other pages, wait for the data you need (`wait --text`) before you interact.
- **Waiting for URLs.** `wait --url "**/x"` has been unreliable. Wait on `--fn "location.pathname === '/x'"` instead.

Feature recipes live in [`features/README.md`](features/README.md). Read the index and use the matching feature file.

## Evidence

```bash
$V shot <feature-id>-<step>   # writes <name>.png (full page), <name>.aria.txt, <name>.url.txt
$V sql "select ... "           # read-only proof of side effects via psql in the db container
```

Evidence is written to `.verify/<run-id>/evidence/`, which is gitignored and survives `down`. `doctor` prints the run id.

Proof standards:

- **Real user path only.** Use the UI as a teacher would. Do not call Supabase directly, set React state, or call server functions to create the state you then "verify". `verify.sh sql` is for reading side effects and cleaning up tagged rows, never for setting up what the UI should do.
- **Action and result.** Capture the state before the action and the state after it, not just the final screen.
- **Side effects.** Check what was persisted as well as what the page shows. That means rows in `submissions`, `viva_questions`, `submission_viva`, `viva_sessions` and `viva_transcript_segments`, and objects in the `submission-viva-audio` storage bucket. Reload the page and confirm the change survives.
- **OpenAI.** Question generation and transcription call the real OpenAI API (`OPENAI_API_KEY`, `AI_VIVA_MODEL` in `apps/web/.env`). There is no dry-run or mock mode in the running app. These calls cost money and need network, so only exercise them when the feature under test needs them, and say so in your report.
- **Unreached paths.** If an entry point cannot be reached, report the command you tried and the precondition that was missing. Never report one entry point as verified through a different one.

## Cleanup

```bash
$V sql "delete from viva_questions where question_text like '[verify <run-id>]%' returning id"   # per feature file
$V down
```

- Delete only the rows your run created. The feature files give the exact statement for each mutation.
- `down` closes the `vv-<run-id>` browser session and kills this run's dev-server process group (pnpm, vite and workerd). It stops Supabase only if this run started it, and clears `.verify/current`.
- `down` never kills anything by process name and never deletes `.verify/<run-id>/evidence/` or the logs.
- After a failed attempt, still run `down` so no processes or ports are left behind. Then `up` again.

## Helpers

`scripts/verify.sh` is the only helper. Its subcommands:

- `up`: start the stack for a new run.
- `doctor`: read-only health check.
- `login`: seed teacher login in this run's browser session.
- `ab <agent-browser args>`: run `agent-browser` in this run's session.
- `shot <name>`: screenshot plus ARIA snapshot plus URL, written to the evidence directory.
- `sql <query>`: run psql inside `supabase_db_viva-voce-ai`.
- `down`: teardown.
