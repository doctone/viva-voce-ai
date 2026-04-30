import { render } from '@testing-library/react'
import {
  RouterProvider,
  createMemoryHistory,
  createRoute,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { AppProviders } from '../components/AppProviders'

type RouteOverrides = Partial<Record<'/' | '/submissions' | '/submissions/new', ReactElement>>

export function renderWithRouter(
  ui: ReactElement,
  initialPath = '/',
  routeOverrides: RouteOverrides = {},
) {
  const rootRoute = createRootRoute()
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => routeOverrides['/'] ?? ui,
  })
  const submissionsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/submissions',
    component: () => routeOverrides['/submissions'] ?? ui,
  })
  const submissionsNewRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/submissions/new',
    component: () => routeOverrides['/submissions/new'] ?? ui,
  })
  const routeTree = rootRoute.addChildren([
    indexRoute,
    submissionsRoute,
    submissionsNewRoute,
  ])

  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })

  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

export { render }
