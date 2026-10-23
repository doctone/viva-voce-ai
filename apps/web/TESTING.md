# Testing strategy

A test earns its place by catching a regression a teacher would notice. It is a
**specification**: it describes behaviour in the product's language and
survives any refactor that keeps that behaviour.

## Seams: where a test touches the code

Test at the highest **seam** that shows the behaviour:

- **Page or route**: the default for anything a teacher sees or does. Render with
  `renderWithRouter` (`src/test/router.tsx`), drive with `userEvent`, query by
  role, label and visible text, and assert what is on screen or what the app
  sent over HTTP.
- **Domain function**: for deep logic with real branching (interval maths,
  state machines, byte ranges, amendment and signing rules, failure-as-value
  orchestrators). Call the exported function and assert its return value, or
  the state left in an in-memory repository fake.

A component, panel, hook or one-consumer helper is tested through the page that
uses it. Its edge cases become extra page-level cases.

## Boundaries: what may be faked

Fake only at the **boundary**, where the app meets something outside it:

- **Network**: MSW (`src/test/server.ts`, shared handlers in
  `src/test/handlers.ts`, data from `src/test/factories.ts`). This covers
  Supabase REST, auth and storage, and OpenAI. Let the real supabase-js client
  make the request.
- **Browser APIs jsdom lacks**: `MediaRecorder`, `getUserMedia`,
  `AudioContext`, `HTMLMediaElement.play`.
- **Time**: Vitest fake timers.
- **Server runtime**: `@tanstack/react-start` (`createServerFn`) and
  `@tanstack/react-start/server` (`getCookies`, `setCookie`), which need the
  Start compiler and a request context.
- **Ports**: a domain function that takes a repository or AI port gets an
  in-memory fake that stores state.

Everything inside the boundary runs for real: our modules, hooks, components
and the router.

Known exception: `useGenerateSubmissionViva` is mocked in page tests because
server functions run in-process under Vitest, not over HTTP. Tracked in beads;
new code keeps its fakes at the boundaries above.

## Assertions

Assert **outcomes**:

- Text, roles and accessible state: `disabled`, `aria-busy`, `aria-current`,
  `aria-pressed`, checked.
- Request URL, method and body captured in an MSW handler.
- Return values, and the final state of a fake.

Finding elements by role, label and text keeps the test on the teacher's side
of the screen. Class names, tag names, `data-*` attributes, test ids,
`querySelector`/`.closest`, storage keys and call counts all describe how the
code is built, so they belong in the code, not in the test.

Expected values come from an independent source: a literal, a worked example,
the spec. Keep the code's own logic out of the expected value.

## Before adding a test

Name the regression it catches that no existing test catches. If none comes to
mind, extend an existing test or skip it. Constant restatements, label maps,
prop forwarding, static copy and third-party behaviour (clsx, tailwind-merge,
Zod) already have an owner.

Coverage is reported on PRs without a floor. Mutation testing
(`pnpm test:mutate`) is the measure of whether tests catch regressions.

## End-to-end tests

E2E tests live in `apps/e2e` (a separate workspace package, so `pnpm test`
and the Vitest loop never run them). They use the open-source
[`e2e`](https://tester.army/e2e) runner to drive Chromium against the real
app (`vite dev` on port 3200) and the local Supabase stack. Run them with
`pnpm test:e2e` after `pnpm db:start`. They need Node 22.22.3+ or 24.8+; see
`apps/e2e/.nvmrc`. The run refuses any `SUPABASE_URL` other than
`http://127.0.0.1:54321`. A failing run leaves `.e2e/report.json`, traces and
screenshots in `apps/e2e/.e2e/`.

Tests are deterministic: locators and `expect`, no model. Agent steps come
later.

### When a journey earns an E2E test

Write one only when the regression lives in something jsdom and MSW cannot
show:

- SSR auth cookies and redirects on a full page load.
- Supabase row-level security and storage, with the real database.
- Server functions over HTTP, not in-process.
- Real media APIs (`MediaRecorder`, `getUserMedia`, audio playback).
- Navigation across several pages.

If a page test can show the behaviour, it stays a page test. Page tests are
faster, cheaper to debug and cover the edge cases. Keep E2E to a few
journeys that a broken deploy would hurt, not one per feature.

### Which layer owns which regression

| Regression | Owner |
| --- | --- |
| Copy, validation, disabled and error states, request bodies | Page test |
| Branching logic in a domain function | Domain function test |
| A teacher cannot reach another teacher's rows | E2E (RLS) |
| Login sets a session that survives a reload | E2E (cookies) |
| Recording a viva uploads audio that plays back | E2E (media, storage) |

### What E2E may fake

Only third-party services we do not run, which today means OpenAI. Never fake
our own code or Supabase. Everything else is the real app against the real
local stack.
