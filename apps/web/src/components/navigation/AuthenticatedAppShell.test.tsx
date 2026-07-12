import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Card, Heading } from '~/components/ui'
import { mutedTextClassName } from '~/lib/class-names'
import { AuthenticatedAppShell } from './AuthenticatedAppShell'
import { render } from '../../test/router'
import { getShouldShowTopbar } from '../../routes/__root'

function renderShellWithRoutes() {
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
      <Card as="section">
        <Heading>Submissions</Heading>
      </Card>
    ),
  })

  const reportsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/reports',
    component: () => (
      <Card as="section">
        <Heading>Reports</Heading>
      </Card>
    ),
  })

  const router = createRouter({
    routeTree: rootRoute.addChildren([submissionsRoute, reportsRoute]),
    history: createMemoryHistory({ initialEntries: ['/submissions'] }),
  })

  render(<RouterProvider router={router} />)

  return router
}

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
        <Card as="section">
          <Heading>Submissions</Heading>
          <p className={mutedTextClassName}>Practice sessions will appear here soon.</p>
        </Card>
      ),
    })

    const reportsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/reports',
      component: () => (
        <Card as="section">
          <Heading>Reports</Heading>
          <p className={mutedTextClassName}>Assessment summaries live here.</p>
        </Card>
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

  it('opens the mobile nav drawer from the hamburger button and closes it via the close button', async () => {
    renderShellWithRoutes()

    const menuButton = await screen.findByRole('button', {
      name: 'Open navigation menu',
    })
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await act(async () => {
      fireEvent.click(menuButton)
    })

    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('link', { name: 'Submissions' })).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Reports' })).toBeInTheDocument()
    expect(within(dialog).getByText('teacher@example.com')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Logout' })).toHaveAttribute(
      'href',
      '/logout',
    )

    await act(async () => {
      fireEvent.click(
        within(dialog).getByRole('button', { name: 'Close navigation menu' }),
      )
    })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('closes the mobile nav drawer after navigating to a new route', async () => {
    const router = renderShellWithRoutes()

    const menuButton = await screen.findByRole('button', {
      name: 'Open navigation menu',
    })

    await act(async () => {
      fireEvent.click(menuButton)
    })

    const dialog = await screen.findByRole('dialog')

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('link', { name: 'Reports' }))
    })

    expect(await screen.findByRole('heading', { name: 'Reports' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/reports')

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
