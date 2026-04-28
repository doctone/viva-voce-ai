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
            { label: 'Vivas', to: '/vivas' },
            { label: 'Reports', to: '/reports' },
          ]}
          userEmail="teacher@example.com"
        >
          <Outlet />
        </AuthenticatedAppShell>
      ),
    })

    const vivasRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/vivas',
      component: () => (
        <section className="paper-panel section-card">
          <h1>Vivas</h1>
          <p className="muted">Practice sessions will appear here soon.</p>
        </section>
      ),
    })

    const reportsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/reports',
      component: () => (
        <section className="paper-panel section-card">
          <h1>Reports</h1>
          <p className="muted">Assessment summaries live here.</p>
        </section>
      ),
    })

    const router = createRouter({
      routeTree: rootRoute.addChildren([vivasRoute, reportsRoute]),
      history: createMemoryHistory({ initialEntries: ['/vivas'] }),
    })

    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('link', { name: 'Vivas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reports' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Vivas' })).toBeInTheDocument()
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

  it('returns false for the public topbar on authenticated vivas routes', () => {
    expect(getShouldShowTopbar('/vivas', ['/__root__', '/_authed'])).toBe(false)
  })
})
