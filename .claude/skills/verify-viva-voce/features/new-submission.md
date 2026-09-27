# New submission

A teacher records a student's written submission (student, title, text) and saves it in one step. The app then generates viva questions for it with OpenAI and opens the submission detail page while generation runs.

## Sub-features

- `create-validate` shows inline errors for a missing student, title or text.
- `create-save` inserts the `submissions` row and navigates to `/submissions/<new id>`.
- `create-generate` kicks off question generation. The detail page shows `Preparing viva questions`, then the generated questions, or `Viva questions unavailable` with a retry.
- `create-wordcount` shows a live `<n> words, guidance: around 400.` hint.

## How to get to it (user POV)

- Choose `New Submission` on `/submissions`.
- Visit `/submissions/new` directly.

## Driving it with verify.sh

Preconditions:

- Baseline from [README.md](README.md). You are logged in.
- `OPENAI_API_KEY` and `AI_VIVA_MODEL` are set in `apps/web/.env`. Without them, `create-generate` can only prove the failure state.
- Choose a tag: `T="[verify <run-id>]"`.

- **Open the form.** Run `$V ab find role link click --name "New Submission"` then `$V ab wait "#studentId"`. The heading reads `New submission`, and the student select lists the 5 seeded student ids once loaded (`Loading students...` before that).
- **Validate.** Run `$V ab find role button click --name "Generate viva questions"`. The page shows `Select a student.`, `Enter a title.` and `Enter the submission text.`, and the URL stays `/submissions/new`.
- **Fill.** Run:
  - `$V ab select "#studentId" "12170000-0000-0000-0000-000000000000"`
  - `$V ab fill "#title" "$T Essay on homework"`
  - `$V ab fill "#submissionText" "<a paragraph of 60+ words>"`

  The word-count hint updates.
- **Save and generate.** Run `$V ab find role button click --name "Generate viva questions"`, then `$V ab wait --fn "/^\/submissions\/[0-9a-f-]{36}$/.test(location.pathname)"`. The h1 is the new title.
- **Watch generation.** Run `$V ab wait --text "Preparing viva questions"`. It may already be gone if the model is fast. Then wait for either the questions or `Viva questions unavailable`: `$V ab wait --fn "document.querySelectorAll('[aria-label^=\"Edit question:\"]').length > 0 || document.body.innerText.includes('Viva questions unavailable')"`. Then run `$V shot new-submission-after`.
- **Side effects.** Save the output of:

  ```bash
  $V sql "select s.id, s.submission_title, count(q.id) from submissions s left join viva_questions q on q.submission_id = s.id where s.submission_title like '[verify <run-id>]%' group by s.id"
  ```

  It shows one submission and, if generation succeeded, its generated question rows.
- **Persistence.** Go back to `/submissions`. The new row is first (newest), with status `Ready to Record`, or `Awaiting Questions` if generation failed.
- **Cleanup.** Delete child rows first:

  ```bash
  $V sql "delete from viva_questions where submission_id in (select id from submissions where submission_title like '[verify <run-id>]%'); delete from submissions where submission_title like '[verify <run-id>]%' returning id"
  ```

  If a delete fails on a foreign key, also delete from `viva_question_sets` and `viva_sessions` for those ids.

## Gotchas

- Generation calls the real OpenAI API and costs money. Create one submission per run, not one per retry.
- Generation starts in the browser before navigation. Closing the session or navigating away mid-run can leave the submission at `Awaiting Questions`. That is a real product state, not a harness bug, so report it as such.
- The student select shows raw UUIDs. Select by value, not by visible label.
- Wait for the student options to finish loading before you submit, or the button stays disabled.
