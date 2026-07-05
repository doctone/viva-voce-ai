import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routeTree } from '../routeTree.gen'
import { server } from '../test/server'

const getUser = vi.fn()

vi.mock('../utils/supabase-server', () => ({
  getSupabaseServerClient: () => ({
    auth: {
      getUser,
    },
  }),
}))

// See -protected-routes.test.tsx for why `createServerFn` is stubbed here:
// TanStack Start's client-side stub needs a full Start request lifecycle
// that Vitest doesn't provide.
vi.mock('@tanstack/react-start', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-start')>()

  function fakeCreateServerFn() {
    let validate = (data: unknown) => data
    const api = {
      inputValidator(fn: (data: unknown) => unknown) {
        validate = fn
        return api
      },
      handler(fn: (opts: { data: unknown }) => unknown) {
        return async (opts?: { data?: unknown }) => fn({ data: validate(opts?.data) })
      },
    }
    return api
  }

  return {
    ...actual,
    createServerFn: fakeCreateServerFn,
  }
})

function renderApp(initialPath: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })

  render(<RouterProvider router={router} />)

  return router
}

function mockUnauthenticated() {
  getUser.mockResolvedValue({ data: { user: null }, error: null })
}

function mockAuthenticated(email = 'teacher@example.com') {
  getUser.mockResolvedValue({ data: { user: { email } }, error: null })
}

describe('landing page routing', () => {
  beforeEach(() => {
    getUser.mockReset()
    server.use(
      http.get('https://example-project.supabase.co/rest/v1/submissions', () => {
        return HttpResponse.json([])
      }),
    )
  })

  it('shows the landing page content to an unauthenticated visitor at /', async () => {
    mockUnauthenticated()

    const router = renderApp('/')

    expect(
      await screen.findByRole('heading', {
        name: 'Prepare viva questions in seconds, not hours',
      }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('links the hero CTA to signup for an unauthenticated visitor', async () => {
    mockUnauthenticated()

    renderApp('/')

    expect(
      await screen.findByRole('link', { name: 'Get started' }),
    ).toHaveAttribute('href', '/signup')
  })

  it('redirects an authenticated visitor at / to /submissions', async () => {
    mockAuthenticated()

    const router = renderApp('/')

    expect(
      await screen.findByRole('heading', { name: 'Submissions' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/submissions')
  })

  it('renders the landing page sections in order', async () => {
    mockUnauthenticated()

    renderApp('/')

    const headline = await screen.findByRole('heading', {
      name: 'Prepare viva questions in seconds, not hours',
    })
    const cta = screen.getByRole('link', { name: 'Get started' })

    expect(
      headline.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})
