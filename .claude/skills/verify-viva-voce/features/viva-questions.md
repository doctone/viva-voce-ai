# Viva questions

On a submission's detail page, the Questions section lists the viva questions. A teacher can edit a question's text inline, add a manual question with a category and optional teacher note, and reorder or remove questions from the viva question set.

## Sub-features

- `questions-list` shows each question as an `Edit question: <text>` button under the `Questions` heading.
- `questions-add` adds a manual question through `Add Manual Question` (category, text, teacher note).
- `questions-add-cancel` discards an unsaved manual question.
- `questions-edit` edits a question's text inline with `Save` / `Cancel`.
- `questions-set` moves questions up or down, or removes them from the viva question set.

## How to get to it (user POV)

- Open a submission from `/submissions`, then scroll to `Questions`.
- Visit `/submissions/<id>` directly.

## Driving it with verify.sh

Preconditions:

- Baseline from [README.md](README.md). You are logged in.
- Fixture: `Technology in Schools Needs Careful Balance` (`21310000-0000-0000-0000-000000000000`, 3 questions).
- Choose a tag: `Q="[verify <run-id>] How would you defend your balance argument?"`.

- **Open.** Run `$V ab open http://localhost:3100/submissions/21310000-0000-0000-0000-000000000000` then `$V ab wait --text "ADD MANUAL QUESTION"`. The `region "QUESTIONS"` holds 3 `Edit question: ...` buttons. Run `$V shot viva-questions-before`.
- **Open the form.** Run `$V ab find role button click --name "Add Manual Question"`. The page shows `#manual-question-category` (options `comprehension_and_accuracy`, `argumentation_and_reasoning`, `authenticity_and_ownership`), `#manual-question-text`, `#manual-question-teacher-note`, and `Save question` / `Cancel`.
- **Fill.** Run:
  - `$V ab select "#manual-question-category" argumentation_and_reasoning`
  - `$V ab fill "#manual-question-text" "$Q"`
  - `$V ab fill "#manual-question-teacher-note" "verify"`
- **Save.** Run `$V ab find role button click --name "Save question"` then `$V ab wait --fn "!document.querySelector('#manual-question-text')"`. The form closes, and a 4th button `Edit question: $Q` appears. Run `$V shot viva-questions-after`.
- **Side effect.** Run the following and save the output as evidence:

  ```bash
  $V sql "select category, teacher_note, submission_id from viva_questions where question_text = '$Q'"
  ```

  It returns one row: `argumentation_and_reasoning|verify|21310000-...`.
- **Persistence.** Run `$V ab reload` and `$V ab wait --text "ADD MANUAL QUESTION"`. The `Edit question: $Q` button is still there.
- **Edit inline.** Run `$V ab find role button click --name "Edit question: $Q"`. A textarea labelled `Edit question text for <label>` appears. Fill it with `$Q (edited)`, run `$V ab find role button click --name "Save"`, and confirm the new text both in the UI and in `viva_questions`.
- **Cleanup.** Run `$V sql "delete from viva_questions where question_text like '[verify <run-id>]%' returning id"`. It returns exactly the rows you added.

## Gotchas

- The snapshot prints `button "ADD MANUAL QUESTION"` and `button "SAVE QUESTION"`. `find --name` needs the source casing: `"Add Manual Question"`, `"Save question"`.
- There are two `Question text` labels once an inline edit is open. Use the `#manual-question-*` ids, not `find label`.
- Manual questions are stored with `origin = 'generated'` (the column default, because the insert does not set `origin`) and `set_position = null`. Identify your rows by `question_text`, not `origin`.
- The fixture's question count feeds the list's status counts. Always delete what you added.
