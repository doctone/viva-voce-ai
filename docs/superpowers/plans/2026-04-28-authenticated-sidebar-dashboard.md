# Authenticated Sidebar Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable authenticated app shell with a left sidebar, route authenticated users to `/vivas`, and render a first placeholder `Vivas` page using TDD.

**Architecture:** Add a dedicated authenticated shell under the existing `/_authed` route boundary, keep the root document responsible only for global chrome selection, and move authenticated primary navigation into a reusable sidebar component. Use small component tests plus one route-level integration test to drive the behavior before implementation.

**Tech Stack:** TanStack Start, TanStack Router, React 19, Vitest, Testing Library, CSS in `app.css`

---

## File Map

- Modify: `apps/web/package.json`
- Modify: `apps/web/vite.config.ts`
- Create: `apps/web/src/test/setup.ts`
- Create: `apps/web/src/test/router.tsx`
- Create: `apps/web/src/components/navigation/AuthenticatedSidebar.tsx`
- Create: `apps/web/src/components/navigation/AuthenticatedSidebar.test.tsx`
- Create: `apps/web/src/components/navigation/AuthenticatedAppShell.tsx`
- Create: `apps/web/src/components/navigation/AuthenticatedAppShell.test.tsx`
- Modify: `apps/web/src/routes/_authed.tsx`
- Create: `apps/web/src/routes/_authed/vivas.tsx`
- Modify: `apps/web/src/routes/index.tsx`
- Modify: `apps/web/src/components/Login.tsx`
- Modify: `apps/web/src/routes/__root.tsx`
- Modify: `apps/web/src/styles/app.css`

## Notes Before Starting

- Do not hand-edit `apps/web/src/routeTree.gen.ts`. Let TanStack regenerate it.
- Keep the sidebar item API minimal: only `label` and `to`.
- Do not add icons, collapsible groups, or future destinations in this slice.
- Keep all production changes behind failing tests first.

### Task 1: Add a Real UI Test Harness

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/vite.config.ts`
- Create: `apps/web/src/test/setup.ts`

- [ ] **Step 1: Add the failing dependency expectation by updating `package.json` first**

Edit `apps/web/package.json` so the test stack includes browser-safe UI test dependencies:

```json
{
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "jsdom": "^26.1.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `pnpm install --filter web`

Expected: install completes and lockfile updates.

- [ ] **Step 3: Configure Vitest for jsdom and shared setup**

Update `apps/web/vite.config.ts` to include a `test` block:

```ts
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    cloudflare({
      viteEnvironment: {
        name: 'ssr',
      },
    }),
  ],
})
```

- [ ] **Step 4: Add shared test setup**

Create `apps/web/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: Run the existing tests to verify the harness works**

Run: `pnpm --filter web test`

Expected: the existing `basic.test.ts` passes under jsdom.

- [ ] **Step 6: Commit the harness setup**

Run:

```bash
git add apps/web/package.json apps/web/vite.config.ts apps/web/src/test/setup.ts pnpm-lock.yaml
git commit -m "test: add ui test harness for web"
```

### Task 2: Create a Router-Aware Render Helper

**Files:**
- Create: `apps/web/src/test/router.tsx`
- Test: `apps/web/src/components/navigation/AuthenticatedSidebar.test.tsx`

- [ ] **Step 1: Write the failing sidebar test that needs router context**

Create `apps/web/src/components/navigation/AuthenticatedSidebar.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthenticatedSidebar } from './AuthenticatedSidebar'
import { renderWithRouter } from '../../test/router'

describe('AuthenticatedSidebar', () => {
  it('renders the Vivas navigation item and links it to /vivas', async () => {
    renderWithRouter(
      <AuthenticatedSidebar
        items={[{ label: 'Vivas', to: '/vivas' }]}
      />,
      '/vivas',
    )

    const vivasLink = await screen.findByRole('link', { name: 'Vivas' })

    expect(vivasLink).toBeInTheDocument()
    expect(vivasLink).toHaveAttribute('href', '/vivas')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails for the right reason**

Run: `pnpm --filter web test -- src/components/navigation/AuthenticatedSidebar.test.tsx`

Expected: FAIL because `AuthenticatedSidebar` and `renderWithRouter` do not exist yet.

- [ ] **Step 3: Create the minimal router helper to satisfy the missing test utility**

Create `apps/web/src/test/router.tsx`:

```tsx
import * as React from 'react'
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { createMemoryHistory } from '@tanstack/react-router'
import { render } from '@testing-library/react'

export function renderWithRouter(ui: React.ReactNode, initialPath = '/') {
  const rootRoute = createRootRoute({
    component: () => <>{ui}</>,
  })

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => null,
  })

  const vivasRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/vivas',
    component: () => null,
  })

  const routeTree = rootRoute.addChildren([indexRoute, vivasRoute])

  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [initialPath],
    }),
  })

  return render(<RouterProvider router={router} />)
}
```

- [ ] **Step 4: Run the test again to verify the next real failure**

Run: `pnpm --filter web test -- src/components/navigation/AuthenticatedSidebar.test.tsx`

Expected: FAIL because `AuthenticatedSidebar` still does not exist.

- [ ] **Step 5: Commit the shared router helper**

Run:

```bash
git add apps/web/src/test/router.tsx apps/web/src/components/navigation/AuthenticatedSidebar.test.tsx
git commit -m "test: add router-aware render helper"
```

### Task 3: Build the Reusable Sidebar Component

**Files:**
- Create: `apps/web/src/components/navigation/AuthenticatedSidebar.tsx`
- Modify: `apps/web/src/styles/app.css`
- Test: `apps/web/src/components/navigation/AuthenticatedSidebar.test.tsx`

- [ ] **Step 1: Keep the existing failing test as the driver**

Test already in place:

```tsx
it('renders the Vivas navigation item and links it to /vivas', async () => {
  renderWithRouter(
    <AuthenticatedSidebar items={[{ label: 'Vivas', to: '/vivas' }]} />,
    '/vivas',
  )

  const vivasLink = await screen.findByRole('link', { name: 'Vivas' })

  expect(vivasLink).toBeInTheDocument()
  expect(vivasLink).toHaveAttribute('href', '/vivas')
})
```

- [ ] **Step 2: Add a second failing test for branding and active state**

Append to `apps/web/src/components/navigation/AuthenticatedSidebar.test.tsx`:

```tsx
it('renders the brand title and marks the current item active', async () => {
  renderWithRouter(
    <AuthenticatedSidebar items={[{ label: 'Vivas', to: '/vivas' }]} />,
    '/vivas',
  )

  expect(screen.getByText('Viva Voce AI')).toBeInTheDocument()

  const vivasLink = await screen.findByRole('link', { name: 'Vivas' })

  expect(vivasLink.className).toContain('sidebar-nav-link-active')
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter web test -- src/components/navigation/AuthenticatedSidebar.test.tsx`

Expected: FAIL because the component file is still missing.

- [ ] **Step 4: Write the minimal sidebar implementation**

Create `apps/web/src/components/navigation/AuthenticatedSidebar.tsx`:

```tsx
import { Link } from '@tanstack/react-router'

type SidebarItem = {
  label: string
  to: '/vivas'
}

type AuthenticatedSidebarProps = {
  items: SidebarItem[]
}

export function AuthenticatedSidebar({
  items,
}: AuthenticatedSidebarProps) {
  return (
    <aside className="paper-panel sidebar-shell">
      <div className="sidebar-brand-block">
        <span className="eyebrow">Academic Minimalist</span>
        <div className="brand-title">Viva Voce AI</div>
        <p className="brand-copy">
          Quiet software for grading, transcripts, and oral assessment
          workflows.
        </p>
      </div>

      <nav aria-label="Primary" className="sidebar-nav">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="sidebar-nav-link"
            activeProps={{
              className: 'sidebar-nav-link sidebar-nav-link-active',
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 5: Add the minimal sidebar styles**

Append to `apps/web/src/styles/app.css`:

```css
.sidebar-shell {
  display: grid;
  gap: var(--space-lg);
  align-content: start;
  padding: clamp(20px, 3vw, 32px);
}

.sidebar-brand-block {
  display: grid;
  gap: var(--space-sm);
}

.sidebar-nav {
  display: grid;
  gap: var(--space-xs);
}

.sidebar-nav-link {
  padding: 12px 14px;
  border: var(--hairline);
  background: var(--surface-container-lowest);
  color: var(--on-surface-variant);
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.sidebar-nav-link-active {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--on-primary);
}
```

- [ ] **Step 6: Run the sidebar tests to verify they pass**

Run: `pnpm --filter web test -- src/components/navigation/AuthenticatedSidebar.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit the sidebar component**

Run:

```bash
git add apps/web/src/components/navigation/AuthenticatedSidebar.tsx apps/web/src/components/navigation/AuthenticatedSidebar.test.tsx apps/web/src/styles/app.css
git commit -m "feat: add authenticated sidebar navigation"
```

### Task 4: Build the Authenticated App Shell

**Files:**
- Create: `apps/web/src/components/navigation/AuthenticatedAppShell.tsx`
- Create: `apps/web/src/components/navigation/AuthenticatedAppShell.test.tsx`
- Modify: `apps/web/src/styles/app.css`

- [ ] **Step 1: Write the failing shell composition test**

Create `apps/web/src/components/navigation/AuthenticatedAppShell.test.tsx`:

```tsx
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthenticatedAppShell } from './AuthenticatedAppShell'
import { renderWithRouter } from '../../test/router'

describe('AuthenticatedAppShell', () => {
  it('renders the sidebar and page content together', async () => {
    renderWithRouter(
      <AuthenticatedAppShell>
        <section>
          <h1>Vivas</h1>
        </section>
      </AuthenticatedAppShell>,
      '/vivas',
    )

    expect(screen.getByText('Viva Voce AI')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Vivas' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the shell test to verify it fails**

Run: `pnpm --filter web test -- src/components/navigation/AuthenticatedAppShell.test.tsx`

Expected: FAIL because `AuthenticatedAppShell` does not exist.

- [ ] **Step 3: Write the minimal shell implementation**

Create `apps/web/src/components/navigation/AuthenticatedAppShell.tsx`:

```tsx
import * as React from 'react'
import { AuthenticatedSidebar } from './AuthenticatedSidebar'

const sidebarItems = [{ label: 'Vivas', to: '/vivas' as const }]

export function AuthenticatedAppShell({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="authenticated-layout">
      <AuthenticatedSidebar items={sidebarItems} />
      <div className="authenticated-content">{children}</div>
    </main>
  )
}
```

- [ ] **Step 4: Add layout styles for the shell**

Append to `apps/web/src/styles/app.css`:

```css
.authenticated-layout {
  display: grid;
  gap: var(--space-lg);
}

.authenticated-content {
  min-width: 0;
}

@media (min-width: 900px) {
  .authenticated-layout {
    grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
    align-items: start;
  }
}
```

- [ ] **Step 5: Run the shell test to verify it passes**

Run: `pnpm --filter web test -- src/components/navigation/AuthenticatedAppShell.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the shell component**

Run:

```bash
git add apps/web/src/components/navigation/AuthenticatedAppShell.tsx apps/web/src/components/navigation/AuthenticatedAppShell.test.tsx apps/web/src/styles/app.css
git commit -m "feat: add authenticated app shell"
```

### Task 5: Add the `/vivas` Page and Route Redirects

**Files:**
- Modify: `apps/web/src/routes/_authed.tsx`
- Create: `apps/web/src/routes/_authed/vivas.tsx`
- Modify: `apps/web/src/routes/index.tsx`
- Modify: `apps/web/src/components/Login.tsx`

- [ ] **Step 1: Write the failing route-level test for the `Vivas` page**

Append to `apps/web/src/components/navigation/AuthenticatedAppShell.test.tsx`:

```tsx
it('renders a placeholder Vivas panel inside the authenticated shell', async () => {
  renderWithRouter(
    <AuthenticatedAppShell>
      <section className="paper-panel section-card">
        <span className="eyebrow">Workspace</span>
        <h1>Vivas</h1>
      </section>
    </AuthenticatedAppShell>,
    '/vivas',
  )

  expect(screen.getByRole('heading', { name: 'Vivas' })).toBeInTheDocument()
  expect(screen.getByText('Workspace')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to verify it fails if the placeholder panel is not present yet**

Run: `pnpm --filter web test -- src/components/navigation/AuthenticatedAppShell.test.tsx`

Expected: FAIL until the test markup or route implementation is aligned.

- [ ] **Step 3: Update the authenticated route boundary to render the app shell**

Replace `apps/web/src/routes/_authed.tsx` with:

```tsx
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { AuthenticatedAppShell } from '../components/navigation/AuthenticatedAppShell'
import { getSupabaseServerClient } from '../utils/supabase'

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      return {
        error: true,
        message: error.message,
      }
    }
  })

export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({
        to: '/login',
      })
    }
  },
  component: AuthedLayout,
})

function AuthedLayout() {
  return (
    <AuthenticatedAppShell>
      <Outlet />
    </AuthenticatedAppShell>
  )
}
```

- [ ] **Step 4: Create the `/vivas` route**

Create `apps/web/src/routes/_authed/vivas.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/vivas')({
  component: VivasPage,
})

function VivasPage() {
  return (
    <section className="paper-panel section-card">
      <span className="eyebrow">Workspace</span>
      <h1>Vivas</h1>
      <p className="muted">
        This area will hold viva workflows and related tools.
      </p>
    </section>
  )
}
```

- [ ] **Step 5: Redirect `/` to `/vivas`**

Replace `apps/web/src/routes/index.tsx` with:

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/vivas' })
  },
})
```

- [ ] **Step 6: Redirect successful login to `/vivas`**

Update `apps/web/src/components/Login.tsx`:

```tsx
onSuccess: async (ctx) => {
  if (!ctx.data?.error) {
    await router.invalidate()
    router.navigate({ to: '/vivas' })
    return
  }
},
```

- [ ] **Step 7: Run the focused tests to verify the route slice passes**

Run: `pnpm --filter web test -- src/components/navigation/AuthenticatedSidebar.test.tsx src/components/navigation/AuthenticatedAppShell.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit the route slice**

Run:

```bash
git add apps/web/src/routes/_authed.tsx apps/web/src/routes/_authed/vivas.tsx apps/web/src/routes/index.tsx apps/web/src/components/Login.tsx apps/web/src/components/navigation/AuthenticatedAppShell.test.tsx
git commit -m "feat: route authenticated users to vivas"
```

### Task 6: Remove the Old Authenticated Top Nav

**Files:**
- Modify: `apps/web/src/routes/__root.tsx`
- Test: `apps/web/src/components/navigation/AuthenticatedAppShell.test.tsx`

- [ ] **Step 1: Write the failing chrome-selection test**

Append to `apps/web/src/components/navigation/AuthenticatedAppShell.test.tsx`:

```tsx
it('does not render the old top navigation links in the authenticated shell', async () => {
  renderWithRouter(
    <AuthenticatedAppShell>
      <section>
        <h1>Vivas</h1>
      </section>
    </AuthenticatedAppShell>,
    '/vivas',
  )

  expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Posts' })).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to verify the expected failure**

Run: `pnpm --filter web test -- src/components/navigation/AuthenticatedAppShell.test.tsx`

Expected: FAIL if the old authenticated top-nav is still part of the rendered authenticated chrome.

- [ ] **Step 3: Update the root document to suppress topbar chrome for `/_authed` matches**

Refactor `apps/web/src/routes/__root.tsx` so the root document computes whether the current route tree includes `/_authed` and only shows the topbar for non-authenticated screens. The key branch should look like this:

```tsx
const isAuthedRoute = useRouterState({
  select: (state) =>
    state.matches.some((match) => match.routeId === '/_authed'),
})

const isAuthPage = pathname === '/login' || pathname === '/signup'

{isAuthPage || isAuthedRoute ? null : (
  <header className="topbar">
    {/* existing public header content */}
  </header>
)}
```

Keep the rest of the public header unchanged.

- [ ] **Step 4: Run the focused tests again**

Run: `pnpm --filter web test -- src/components/navigation/AuthenticatedSidebar.test.tsx src/components/navigation/AuthenticatedAppShell.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the root chrome change**

Run:

```bash
git add apps/web/src/routes/__root.tsx apps/web/src/components/navigation/AuthenticatedAppShell.test.tsx
git commit -m "refactor: move authenticated nav into sidebar shell"
```

### Task 7: Regenerate Routes and Run Full Verification

**Files:**
- Generated: `apps/web/src/routeTree.gen.ts`

- [ ] **Step 1: Regenerate the TanStack route tree**

Run: `pnpm --filter web build`

Expected: route generation runs and `apps/web/src/routeTree.gen.ts` updates if needed.

- [ ] **Step 2: Run the full web test suite**

Run: `pnpm --filter web test`

Expected: PASS.

- [ ] **Step 3: Start the app for browser verification**

Run: `pnpm --filter web dev`

Expected: local app available on `http://localhost:3000`.

- [ ] **Step 4: Verify the authenticated UI in the browser**

Manual checks:

```text
1. Log in successfully.
2. Confirm the app lands on /vivas.
3. Confirm the sidebar shows Viva Voce AI branding.
4. Confirm Vivas is the only primary nav item.
5. Confirm the main panel shows the Vivas heading.
6. Confirm Home and Posts no longer appear as top-nav links on authenticated pages.
7. Confirm mobile width stacks the sidebar above content.
8. Confirm the console is clean.
```

- [ ] **Step 5: Commit regenerated routes if they changed**

Run:

```bash
git add apps/web/src/routeTree.gen.ts
git commit -m "chore: regenerate route tree for vivas shell"
```

- [ ] **Step 6: Final status check**

Run: `git status`

Expected: clean working tree.

## Self-Review

- Spec coverage check: shell, sidebar, `/vivas`, redirect behavior, removal of authenticated top nav, styling, accessibility-aware semantics, and TDD are all represented in the tasks above.
- Placeholder scan: no `TODO`, `TBD`, or deferred test instructions remain.
- Type consistency check: the sidebar item type uses `label` and `to` consistently across tests, component code, and shell composition.
