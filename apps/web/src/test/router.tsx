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

type RouteOverrides = Partial<
  Record<
    | '/'
    | '/login'
    | '/signup'
    | '/submissions'
    | '/submissions/new'
    | '/submissions/$submissionId'
    | '/submissions/$submissionId/conduct',
    ReactElement
  >
>

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
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: () => routeOverrides['/login'] ?? ui,
  })
  const signupRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/signup',
    component: () => routeOverrides['/signup'] ?? ui,
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
  const submissionDetailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/submissions/$submissionId',
    component: () => routeOverrides['/submissions/$submissionId'] ?? ui,
  })
  const submissionConductRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/submissions/$submissionId/conduct',
    component: () =>
      routeOverrides['/submissions/$submissionId/conduct'] ?? ui,
  })
  const routeTree = rootRoute.addChildren([
    indexRoute,
    loginRoute,
    signupRoute,
    submissionsRoute,
    submissionsNewRoute,
    submissionDetailRoute,
    submissionConductRoute,
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
