# Viva Voce AI verification map

This directory is the maintained source for verifying the user-facing behavior of the Viva Voce AI web app. Read this index before driving the app, then follow the matching feature file as the recipe.

| Feature | File | Touches OpenAI |
| --- | --- | --- |
| Sign in, sign up, log out | [sign-in.md](sign-in.md) | no |
| Browse, search and filter submissions | [submissions-list.md](submissions-list.md) | no |
| Create a submission (generates questions) | [new-submission.md](new-submission.md) | yes: question generation |
| Review and edit viva questions | [viva-questions.md](viva-questions.md) | no |
| Record or upload the viva | [viva-recording.md](viva-recording.md) | yes: transcription |

These routes are not mapped:

- `/student-records` is a placeholder that always shows "No student records yet".
- `/submissions/<id>/conduct` has a route file, but nothing links to it and the detail page has no `<Outlet />`, so it renders the ordinary submission detail page.

## Baseline preconditions

- `V=.claude/skills/verify-viva-voce/scripts/verify.sh` (every recipe uses `$V`).
- `$V up` printed `READY`, and `$V doctor` shows every line as `OK`.
- The seed data is intact:
  - teacher `will@viva-voce.org` / `password-will`
  - 5 students and 5 submissions
  - 2 Awaiting Questions, 1 Ready to Record, 2 Recorded
- `supabase db reset` restores the seed, but it wipes the shared local database. Never run it without the user's consent.
- The recipes use the app at `http://localhost:3100`. Substitute your port if you set `VERIFY_PORT`.

Seeded submissions useful as fixtures:

| Title | Id | Status |
| --- | --- | --- |
| Technology in Schools Should Be Limited | `20420000-0000-0000-0000-000000000000` | Recorded (has audio and a transcript) |
| Technology in Schools Needs Careful Balance | `21310000-0000-0000-0000-000000000000` | Ready to Record (3 questions, no audio) |
| Victorian Archive Research Commentary | `21840000-0000-0000-0000-000000000000` | Awaiting Questions |

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Run every browser command as `$V ab ...`, so it goes to this run's `vv-<run-id>` session. Log in with `$V login`.
- Use element ids and aria-labels first. With `find role ... --name`, use the name as written in the source (`"Save question"`), not the upper-case version the snapshot prints.
- Tag every row you create with `[verify <run-id>]` in a text field, and delete it by that tag during cleanup.
- Treat every command as literal. Keep quoted names and flags unchanged.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen: `$V shot <feature>-before` and `$V shot <feature>-after`.
- UI proof is the `.png` and `.aria.txt` that `$V shot` writes, with the app's page heading visible.
- Mutation proof is the page after a reload, plus a `$V sql "select ..."` of the stored row, saved as `$V sql "..." > .verify/<run-id>/evidence/<feature>.sql.txt`.
- Record the feature file and entry point you used for every artifact.
- If an entry point cannot be reached, report the command you tried and the precondition that was missing. Do not report it as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then has exactly four H2 sections, in this order:

1. `Sub-features` lists short ids, one line per behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with verify.sh` starts with `Preconditions:`, then labeled bullets that pair each user action with an exact command and the result you should observe.
4. `Gotchas` lists traps that can waste or invalidate a verification run.
