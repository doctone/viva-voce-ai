## Summary

Add a reusable authenticated app shell with a left sidebar as the primary navigation. The first authenticated destination will be `/vivas`, which will render a simple placeholder content panel. The existing top navigation will no longer appear on authenticated pages.

## Goals

- Make authenticated navigation reusable across future dashboard pages.
- Preserve the existing editorial, paper-and-ink design language.
- Redirect authenticated users to `/vivas` as the primary landing page.
- Keep unauthenticated pages and auth screens visually unchanged.
- Implement the work using TDD.

## Non-Goals

- Building real viva workflows or data-backed pages.
- Adding more authenticated destinations beyond `Vivas`.
- Reworking the unauthenticated landing and auth page layouts.
- Introducing a new design system or component library.

## Current Context

- Authentication gating is already split between `src/routes/__root.tsx` and `src/routes/_authed.tsx`.
- The current root document renders a top header with navigation for non-auth pages.
- Styling already establishes the desired visual language: restrained color, sharp edges, hairline borders, editorial typography, and paper-panel surfaces.
- There is currently no dedicated authenticated application shell.

## Proposed Approach

Use a dedicated authenticated shell route under `/_authed`.

### Route Structure

- Keep `/_authed` as the authenticated route boundary.
- Add an authenticated shell component that wraps child authenticated pages.
- Create a new `/vivas` authenticated route as the initial landing page.
- Redirect authenticated users away from `/login` and `/signup` to `/vivas`.
- Stop using `/` as the post-login landing page.

### Layout Structure

The authenticated shell will render two primary regions:

- Left sidebar: branding plus vertical primary navigation.
- Main content area: routed page content rendered via `Outlet`.

Behavior by viewport:

- Desktop/tablet: two-column layout with fixed visual priority on the sidebar.
- Mobile: stacked layout with the sidebar first and content below.

### Navigation Model

Create a reusable sidebar component driven by a small item list.

Each item will contain:

- `label`
- `to`

Initial item set:

- `Vivas` -> `/vivas`

The active item should clearly indicate current route state using the same uppercase, strong-button treatment already established in the app, adapted for a vertical layout.

## Component Design

### `AuthenticatedSidebar`

Purpose:

- Render authenticated branding and primary navigation.

Responsibilities:

- Show the app brand at the top of the sidebar.
- Render the vertical navigation list.
- Indicate the active route.

Inputs:

- `items`: array of sidebar navigation items.

Notes:

- Keep the API intentionally small.
- Do not introduce icons or secondary navigation in this slice.

### `AuthenticatedAppShell`

Purpose:

- Provide the reusable authenticated page layout.

Responsibilities:

- Compose the sidebar and main content region.
- Accept children or routed outlet content.
- Apply authenticated layout styling only.

### `/vivas` Route Page

Purpose:

- Provide the first destination inside the authenticated shell.

Responsibilities:

- Render a simple placeholder panel with a `Vivas` heading.
- Match the existing panel language and spacing.

## Styling Direction

Follow the established patterns in `app.css` rather than introducing a separate styling model.

Key visual constraints:

- Reuse the same color palette and type hierarchy.
- Continue using hairline borders and paper-panel surfaces.
- Preserve sharp, restrained UI rather than rounded or gradient-heavy treatments.
- Keep spacing on the existing scale.

Expected additions:

- Authenticated shell layout classes.
- Sidebar container styling.
- Vertical nav item styling.
- Responsive rules for stacked mobile layout.

## Changes to Existing Layout Behavior

- On authenticated pages, remove the top navigation entirely.
- On authenticated pages, move branding into the sidebar.
- On unauthenticated pages, keep the existing root-level experience intact.

This means the root document will need route-aware layout behavior so authenticated pages render the sidebar shell instead of the current topbar treatment.

## Accessibility

- Use semantic navigation markup for the sidebar.
- Ensure the active item is exposed through normal link semantics.
- Keep all interactive elements keyboard accessible.
- Preserve clear heading hierarchy in the main panel.
- Ensure mobile stacking order remains logical for keyboard and screen reader users.

## Testing Strategy

This work will be implemented with TDD.

### Red-Green Sequence

1. Write a failing test asserting the sidebar renders the `Vivas` item.
2. Write a failing test asserting `Vivas` links to `/vivas`.
3. Write a failing test asserting the authenticated shell renders sidebar navigation and routed content together.
4. Write a failing test asserting the `/vivas` route renders a placeholder panel with the `Vivas` heading.
5. Write a failing test asserting the old top navigation is not shown on authenticated pages.
6. Implement the minimum code to satisfy each test in sequence.

### Automated Test Scope

- Sidebar item rendering.
- Sidebar destination wiring.
- Authenticated shell composition.
- `/vivas` placeholder content.
- Authenticated layout behavior replacing top navigation.

### Browser Verification

After tests pass, verify in the browser:

- `/vivas` loads without console errors.
- Sidebar appears as the primary nav.
- Active state is visible for `Vivas`.
- Layout works at narrow and wide viewports.
- Unauthenticated auth pages still render as before.

## Risks and Mitigations

### Risk: Root layout logic becomes tangled

Mitigation:

- Keep authenticated layout concerns encapsulated in a dedicated shell component.
- Minimize branching in `__root.tsx` to route-aware layout selection only.

### Risk: Sidebar styling drifts from the established language

Mitigation:

- Reuse existing tokens, panel styles, and nav conventions.
- Avoid introducing new decorative patterns.

### Risk: Route redirects become inconsistent

Mitigation:

- Keep redirect behavior explicit in existing auth route boundaries.
- Add tests around authenticated rendering expectations.

## Implementation Notes

- Prefer minimal new abstractions.
- Keep the sidebar item model simple until a second real destination exists.
- Do not add speculative submenu, collapse, or icon behavior.

## Acceptance Criteria

- Authenticated users land on `/vivas` rather than `/`.
- Authenticated pages render a left sidebar as the primary navigation.
- The sidebar includes branding and one nav item: `Vivas`.
- `Vivas` links to `/vivas`.
- The main area on `/vivas` shows a simple placeholder panel with a `Vivas` heading.
- The existing top nav no longer appears on authenticated pages.
- Unauthenticated pages keep their current experience.
- Automated tests cover the new sidebar shell behavior.
