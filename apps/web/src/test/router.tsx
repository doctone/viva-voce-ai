import { render } from '@testing-library/react'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import type { ReactElement } from 'react'

export function renderWithRouter(ui: ReactElement, initialPath = '/') {
  const routeTree = createRootRoute({
    component: () => ui,
  })

  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })

  return render(<RouterProvider router={router} />)
}

export { render }
