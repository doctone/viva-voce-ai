import { act, fireEvent, screen } from '@testing-library/react'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cn,
  headingOneClassName,
  mutedTextClassName,
  paperPanelClassName,
  sectionCardClassName,
} from '../../styles/classes'
import { AuthenticatedAppShell } from './AuthenticatedAppShell'
import { render } from '../../test/router'
import { getShouldShowTopbar } from '../../routes/__root'

describe('AuthenticatedAppShell', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn()
  })

  it('renders the whole page and changes routes when a sidebar nav item is clicked', async () => {
    const rootRoute = createRootRoute({
      component: () => (
        <AuthenticatedAppShell
          items={[
            { label: 'Submissions', to: '/submissions' },
            { label: 'Reports', to: '/reports' },
          ]}
          userEmail="teacher@example.com"
        >
          <Outlet />
        </AuthenticatedAppShell>
      ),
    })

    const submissionsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/submissions',
      component: () => (
        <section className={cn(paperPanelClassName, sectionCardClassName)}>
          <h1 className={headingOneClassName}>Submissions</h1>
          <p className={mutedTextClassName}>Practice sessions will appear here soon.</p>
        </section>
      ),
    })

    const reportsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/reports',
      component: () => (
        <section className={cn(paperPanelClassName, sectionCardClassName)}>
          <h1 className={headingOneClassName}>Reports</h1>
          <p className={mutedTextClassName}>Assessment summaries live here.</p>
        </section>
      ),
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([submissionsRoute, reportsRoute]),
      history: createMemoryHistory({ initialEntries: ['/submissions'] }),
    })

    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('link', { name: 'Submissions' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reports' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Submissions' })).toBeInTheDocument()
    expect(screen.getByText('teacher@example.com')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Logout' })).toHaveAttribute(
      'href',
      '/logout',
    )

    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: 'Reports' }))
    })

    expect(await screen.findByRole('heading', { name: 'Reports' })).toBeInTheDocument()
    expect(screen.getByText('Assessment summaries live here.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/reports')
  })

  it('returns false for the public topbar on authenticated submissions routes', () => {
    expect(getShouldShowTopbar('/submissions', ['/__root__', '/_authed'])).toBe(false)
  })
})
