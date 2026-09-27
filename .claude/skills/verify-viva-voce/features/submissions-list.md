# Submissions list

The `/submissions` workspace lists every submission, newest first, with its student, date and status chip. A teacher can search by title or student id, filter by status, sort columns, and open a submission.

## Sub-features

- `list-load` shows all submissions with a result count.
- `list-search` narrows rows by a case-insensitive match on title or student id.
- `list-filter` narrows rows to one status (All, Awaiting Questions, Ready to Record, Recorded) with per-status counts.
- `list-clear` resets search and filter via `Clear` / `Clear Filters`.
- `list-sort` sorts by Submission, Submitted or Status column headers.
- `list-open` opens a submission's detail page from its title link or row.

## How to get to it (user POV)

- Log in, which lands on `/submissions`.
- Choose "Submissions" in the sidebar, or the "Submissions" breadcrumb on a detail page.

## Driving it with verify.sh

Preconditions:

- Baseline from [README.md](README.md). You are logged in (`$V login`) and the page is at `/submissions`.

- **Load.** Run `$V ab wait --text "5 submissions"`, then `$V shot submissions-list-before`. The status reads `5 submissions`, the filter group shows `All 5`, `Awaiting Questions 2`, `Ready to Record 1`, `Recorded 2`, and `table "Submissions"` has 5 rows.
- **Search.** Run `$V ab find placeholder "Search submissions" fill "Victorian"` then `$V ab wait --text "Showing 1 of 5 submissions"`. The only row link is `Victorian Archive Research Commentary`. Searching `11840000` (a student id prefix) gives the same row.
- **Clear search.** Run `$V ab find role button click --name "Clear"`. The status goes back to `5 submissions`.
- **Filter.** Run `$V ab find role button click --name "Recorded"`. The status reads `Showing 2 of 5 submissions` and every row's status cell reads `Recorded`. `$V ab eval "document.querySelector('[aria-pressed=true]').textContent"` returns `"Recorded2"`.
- **Filter plus search with no match.** With `Recorded` still active, search `Victorian`. The empty state reads `No submissions match these filters.`, and `Clear Filters` resets both.
- **Open.** Run `$V ab find role link click --name "Technology in Schools Needs Careful Balance"` then `$V ab wait --fn "location.pathname === '/submissions/21310000-0000-0000-0000-000000000000'"`. The detail page's h1 is the submission title.
- **Proof.** Run `$V shot submissions-list-after` after each state you are proving.

## Gotchas

- The table renders after a `Loading submissions...` status. Wait for the count text before you snapshot or assert on rows.
- Search and filter state is React state, not URL state. The URL stays `/submissions`, so a reload resets both.
- `find role button --name "All"` also matches a substring, and `"Recorded"` could match other buttons in future. Check `aria-pressed` after clicking.
- Status counts come from question and audio counts on the rows. A run that adds questions or audio to a fixture changes these numbers for the next run. Clean up.
