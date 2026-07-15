import { render, screen } from '@testing-library/react'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { Breadcrumb } from './Breadcrumb'

function renderBreadcrumb(items: Array<{ label: string; to?: string }>) {
  const rootRoute = createRootRoute({
    component: () => <Breadcrumb items={items} />,
  })
  const submissionsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/submissions',
    component: () => <div>Submissions list</div>,
  })

  const router = createRouter({
    routeTree: rootRoute.addChildren([submissionsRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  return render(<RouterProvider router={router} />)
}

describe('Breadcrumb', () => {
  it('renders each item as a link except the current page', async () => {
    renderBreadcrumb([
      { label: 'Submissions', to: '/submissions' },
      { label: 'Mercantile law response' },
    ])

    const submissionsLink = await screen.findByRole('link', { name: 'Submissions' })
    expect(submissionsLink).toHaveAttribute('href', '/submissions')

    const currentPage = screen.getByText('Mercantile law response')
    expect(currentPage.tagName).toBe('SPAN')
    expect(currentPage).toHaveAttribute('aria-current', 'page')
  })

  it('does not link the last item even when it has a `to`', async () => {
    renderBreadcrumb([
      { label: 'Submissions', to: '/submissions' },
      { label: 'Current', to: '/submissions' },
    ])

    expect(await screen.findAllByRole('link')).toHaveLength(1)
  })
})
