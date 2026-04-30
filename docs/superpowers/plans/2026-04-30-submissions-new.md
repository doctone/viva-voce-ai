# New Submission Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real `/submissions/new` creation flow with a student dropdown, advisory word count, submission persistence, and redirect back to `/submissions` using TDD.

**Architecture:** Keep the page aligned with the existing submissions list by using the browser Supabase client for both student lookup and submission creation. Drive the route with React Query plus the local `useMutation` hook, add only the minimum database policy needed for authenticated inserts, and verify the behavior through MSW-backed route tests.

**Tech Stack:** TanStack Router, TanStack Query, React 19, Supabase browser client, Vitest, Testing Library, MSW, SQL migrations

---

## File Map

- Create: `apps/web/src/routes/_authed/submissions.new.test.tsx`
- Modify: `apps/web/src/routes/_authed/submissions.new.tsx`
- Modify: `apps/web/src/test/router.tsx`
- Modify: `packages/database/supabase/migrations/20260429134955_create_students_and_vivas_tables_again.sql`

## Task 1: Drive the Form Surface From a Failing Route Test

**Files:**
- Create: `apps/web/src/routes/_authed/submissions.new.test.tsx`
- Modify: `apps/web/src/test/router.tsx`
- Modify: `apps/web/src/routes/_authed/submissions.new.tsx`

- [ ] **Step 1: Write the failing render test**

Create `apps/web/src/routes/_authed/submissions.new.test.tsx` with a test that expects the student request and form fields:

```tsx
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { NewVivaSubmissionPage } from './submissions.new'
import { renderWithRouter } from '../../test/router'
import { server } from '../../test/server'

describe('NewVivaSubmissionPage', () => {
  it('requests students and renders the submission form fields', async () => {
    process.env.SUPABASE_URL = 'https://example-project.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'

    let requestedStudents = false

    server.use(
      http.get('https://example-project.supabase.co/rest/v1/students', () => {
        requestedStudents = true
        return HttpResponse.json([
          { id: '10420000-0000-0000-0000-000000000000' },
        ])
      }),
    )

    renderWithRouter(<NewVivaSubmissionPage />, '/submissions/new')

    await waitFor(() => {
      expect(requestedStudents).toBe(true)
    })

    expect(screen.getByRole('heading', { name: 'New submission' })).toBeInTheDocument()
    expect(screen.getByLabelText('Student')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Submission text')).toBeInTheDocument()
    expect(
      await screen.findByRole('option', { name: '10420000-0000-0000-0000-000000000000' }),
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test -- src/routes/_authed/submissions.new.test.tsx`

Expected: FAIL because the page is still a placeholder and the router helper does not include `/submissions/new`.

- [ ] **Step 3: Extend the router helper for the new route**

Update `apps/web/src/test/router.tsx` so the helper includes `/submissions` and `/submissions/new` routes in the route tree.

- [ ] **Step 4: Implement the minimal form shell and student query**

Update `apps/web/src/routes/_authed/submissions.new.tsx` to:

- export `NewVivaSubmissionPage`
- fetch students with the browser Supabase client via `useQuery`
- render the student select, title input, textarea, and top explanatory copy

- [ ] **Step 5: Run the test again to verify it passes**

Run: `pnpm --filter web test -- src/routes/_authed/submissions.new.test.tsx`

Expected: PASS.

## Task 2: Drive the Advisory Word Count

**Files:**
- Modify: `apps/web/src/routes/_authed/submissions.new.test.tsx`
- Modify: `apps/web/src/routes/_authed/submissions.new.tsx`

- [ ] **Step 1: Write the failing word-count test**

Append this test:

```tsx
import userEvent from '@testing-library/user-event'

it('updates the advisory word count as the submission text changes', async () => {
  process.env.SUPABASE_URL = 'https://example-project.supabase.co'
  process.env.SUPABASE_ANON_KEY = 'test-anon-key'

  server.use(
    http.get('https://example-project.supabase.co/rest/v1/students', () => {
      return HttpResponse.json([{ id: '10420000-0000-0000-0000-000000000000' }])
    }),
  )

  const user = userEvent.setup()

  renderWithRouter(<NewVivaSubmissionPage />, '/submissions/new')

  const textArea = await screen.findByLabelText('Submission text')

  await user.type(textArea, 'One two three four')

  expect(screen.getByText('4 words, guidance: around 400.')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test -- src/routes/_authed/submissions.new.test.tsx`

Expected: FAIL because the page does not yet track or render live word count.

- [ ] **Step 3: Implement minimal word-count state**

Track textarea content in component state, compute count by splitting trimmed text on whitespace, and render the advisory copy below the textarea.

- [ ] **Step 4: Run the test again to verify it passes**

Run: `pnpm --filter web test -- src/routes/_authed/submissions.new.test.tsx`

Expected: PASS.

## Task 3: Drive Successful Submission Creation and Redirect

**Files:**
- Modify: `apps/web/src/routes/_authed/submissions.new.test.tsx`
- Modify: `apps/web/src/routes/_authed/submissions.new.tsx`
- Modify: `packages/database/supabase/migrations/20260429134955_create_students_and_vivas_tables_again.sql`

- [ ] **Step 1: Write the failing success test**

Append a test that submits the form, asserts the POST payload, and verifies navigation to `/submissions`:

```tsx
it('creates the submission and redirects back to the submissions list', async () => {
  process.env.SUPABASE_URL = 'https://example-project.supabase.co'
  process.env.SUPABASE_ANON_KEY = 'test-anon-key'

  let postedBody: Record<string, unknown> | undefined

  server.use(
    http.get('https://example-project.supabase.co/rest/v1/students', () => {
      return HttpResponse.json([{ id: '10420000-0000-0000-0000-000000000000' }])
    }),
    http.post('https://example-project.supabase.co/rest/v1/submissions', async ({ request }) => {
      postedBody = (await request.json()) as Record<string, unknown>
      return HttpResponse.json([{ id: '30420000-0000-0000-0000-000000000000' }], {
        status: 201,
      })
    }),
  )

  const user = userEvent.setup()

  renderWithRouter(<NewVivaSubmissionPage />, '/submissions/new')

  await user.selectOptions(
    await screen.findByLabelText('Student'),
    '10420000-0000-0000-0000-000000000000',
  )
  await user.type(screen.getByLabelText('Title'), 'Economic policy reflection')
  await user.type(
    screen.getByLabelText('Submission text'),
    'This submission examines monetary policy and public argument.',
  )
  await user.click(
    screen.getByRole('button', { name: 'Generate viva questions' }),
  )

  await waitFor(() => {
    expect(postedBody).toEqual({
      student_id: '10420000-0000-0000-0000-000000000000',
      submission_title: 'Economic policy reflection',
      submission_text:
        'This submission examines monetary policy and public argument.',
    })
  })

  expect(await screen.findByText('Submissions index')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test -- src/routes/_authed/submissions.new.test.tsx`

Expected: FAIL because submit logic and redirect do not exist.

- [ ] **Step 3: Implement minimal mutation and redirect**

Use the local `useMutation` hook with a browser Supabase insert function, invalidate the `['submissions']` query, and navigate to `/submissions` on success.

- [ ] **Step 4: Add the insert policy required by production**

Update `packages/database/supabase/migrations/20260429134955_create_students_and_vivas_tables_again.sql` to add an authenticated insert policy on `public.submissions`.

- [ ] **Step 5: Run the test again to verify it passes**

Run: `pnpm --filter web test -- src/routes/_authed/submissions.new.test.tsx`

Expected: PASS.

## Task 4: Drive Failure Handling

**Files:**
- Modify: `apps/web/src/routes/_authed/submissions.new.test.tsx`
- Modify: `apps/web/src/routes/_authed/submissions.new.tsx`

- [ ] **Step 1: Write the failing error-state test**

Append this test:

```tsx
it('shows an inline error when submission creation fails', async () => {
  process.env.SUPABASE_URL = 'https://example-project.supabase.co'
  process.env.SUPABASE_ANON_KEY = 'test-anon-key'

  server.use(
    http.get('https://example-project.supabase.co/rest/v1/students', () => {
      return HttpResponse.json([{ id: '10420000-0000-0000-0000-000000000000' }])
    }),
    http.post('https://example-project.supabase.co/rest/v1/submissions', () => {
      return HttpResponse.json({ message: 'Insert failed' }, { status: 500 })
    }),
  )

  const user = userEvent.setup()

  renderWithRouter(<NewVivaSubmissionPage />, '/submissions/new')

  await user.selectOptions(
    await screen.findByLabelText('Student'),
    '10420000-0000-0000-0000-000000000000',
  )
  await user.type(screen.getByLabelText('Title'), 'Economic policy reflection')
  await user.type(screen.getByLabelText('Submission text'), 'Short text for failure path.')
  await user.click(
    screen.getByRole('button', { name: 'Generate viva questions' }),
  )

  expect(
    await screen.findByText('We could not create the submission. Please try again.'),
  ).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'New submission' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test -- src/routes/_authed/submissions.new.test.tsx`

Expected: FAIL because the form does not yet surface an inline mutation error.

- [ ] **Step 3: Implement minimal error handling**

Render a form-level error message when the mutation fails, keeping the user on the page.

- [ ] **Step 4: Run the test again to verify it passes**

Run: `pnpm --filter web test -- src/routes/_authed/submissions.new.test.tsx`

Expected: PASS.

## Task 5: Verify the Full Slice

**Files:**
- Modify: any files already touched above

- [ ] **Step 1: Run the focused web test file**

Run: `pnpm --filter web test -- src/routes/_authed/submissions.new.test.tsx`

Expected: all tests in the file PASS.

- [ ] **Step 2: Run the full web test suite**

Run: `pnpm --filter web test`

Expected: PASS.

- [ ] **Step 3: Run the web build**

Run: `pnpm --filter web build`

Expected: PASS.
