import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    // Quick navigations show nothing; slow ones show the pending shell for at
    // least 300ms so it never flickers in and straight back out.
    defaultPendingMs: 150,
    defaultPendingMinMs: 300,
    defaultPreload: 'intent',
    defaultViewTransition: true,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
