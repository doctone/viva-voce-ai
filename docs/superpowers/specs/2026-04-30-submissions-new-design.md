## Summary

Replace the placeholder on `/submissions/new` with a production-grade submission creation form. The first version collects a student, a title, and long-form submission text, shows advisory word-count guidance around 400 words, uses the CTA label `Generate viva questions`, creates the submission record only, and redirects back to `/submissions` after success.

## Goals

- Turn `/submissions/new` into a real authenticated creation flow.
- Preserve the calm paper-and-ink product language already established across authenticated pages.
- Keep the first version honest: the CTA promises question generation later, but currently creates only the submission record.
- Implement the work with TDD.

## Non-Goals

- Generating viva questions.
- Designing a multi-step wizard.
- Adding a submission detail page.
- Expanding the student data model beyond what already exists.

## Current Context

- `/submissions/new` is currently a placeholder panel.
- `/submissions` already reads rows directly from Supabase in the browser through `useVivas`.
- `public.submissions` currently stores `student_id`, `submission_title`, `submission_text`, and `created_at`.
- `public.students` currently exposes only `id`, so the first version must use that existing identifier in the selector.
- Row-level security currently allows authenticated reads for `students` and `submissions`, but not submission inserts.

## Confirmed Shape

- Page posture: a single writing sheet, no guidance rail.
- Primary action label: `Generate viva questions`.
- Post-submit destination: `/submissions`.
- Word guidance: advisory only, with a live word count.
- Student selection: required dropdown of all students.

## Proposed Approach

### Layout

Render one primary paper panel with restrained page chrome.

- Eyebrow: `Submissions`
- Heading: `New submission`
- One short paragraph explaining that the submission is created now and viva questions will be generated from it later.
- Form fields in a single vertical sequence.

The page should feel like a composed drafting surface rather than a utility dashboard. The textarea is the visual center. The primary action sits directly below the form content so the page reads as one continuous workflow.

### Form Structure

The form contains three fields:

- `Student`: required select populated from `public.students`
- `Title`: required single-line text input
- `Submission text`: required multiline textarea sized for sustained writing

Below the textarea, show a quiet live word count with advisory guidance around 400 words. This is informative only. It never blocks submission.

### Data Flow

- Fetch student options from Supabase in the browser, following the same general client-side data pattern already used on the submissions list.
- Create submissions from the browser using the Supabase client.
- Add the minimum database policy needed so authenticated users can insert into `public.submissions`.
- After a successful insert, invalidate the submissions query and navigate back to `/submissions`.

### Copy Contract

The interface must not misrepresent current behavior. Supporting copy near the top of the page should clarify that the submission is saved now and question generation will be connected next.

## Accessibility

- Use a real `<label>` for each field.
- Keep the select, input, textarea, and button fully keyboard accessible.
- Surface submission failures in readable text within the form.
- Preserve clear heading order and dependable focus behavior.

## Testing Strategy

This work will be implemented with TDD.

### Red-Green Sequence

1. Write a failing test that the page requests student options and renders the form fields.
2. Write a failing test that the live word count updates as text is entered.
3. Write a failing test that a successful submit posts the expected submission payload and redirects to `/submissions`.
4. Write a failing test that a failed submit keeps the user on the page and shows an error message.
5. Add the minimum code to satisfy each test in order.

### Automated Test Scope

- Student dropdown population.
- Title and textarea rendering.
- Advisory live word count behavior.
- Successful submission creation and redirect.
- Failed submission handling.

### Browser Verification

After tests pass, verify in the browser:

- `/submissions/new` loads without console errors.
- The student dropdown is populated.
- Word count updates during typing.
- Successful submission returns to `/submissions`.
- The new submission appears in the submissions list.

## Risks and Mitigations

### Risk: Student IDs are not especially human-friendly

Mitigation:

- Use the existing IDs for this slice rather than inventing names the schema does not hold.
- Keep the option labeling consistent and neutral until richer student data exists.

### Risk: Browser inserts fail due to missing policy

Mitigation:

- Add a narrow insert policy for authenticated users as part of the same change.

### Risk: The CTA overpromises future behavior

Mitigation:

- Add explicit explanatory copy near the top of the form so current behavior remains honest.

## Acceptance Criteria

- `/submissions/new` renders a real form instead of placeholder text.
- The form includes a required student dropdown, title input, and submission textarea.
- The textarea has advisory live word count guidance around 400 words.
- The primary CTA reads `Generate viva questions`.
- Submitting the form creates a submission record only.
- Successful submission redirects back to `/submissions`.
- Failed submission shows an inline error and does not redirect.
- Authenticated users can insert submissions through the current app flow.
- Automated tests cover the new behavior.
