import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routeTree } from '../routeTree.gen'
import { server } from '../test/server'
import {
  createTestQuestion,
  createTestSubmission,
  createTestVivaQuestionSet,
  createTestVivaSession,
} from '../test/factories'
import {
  askedQuestionsHandler,
  submissionVivaHandler,
  submissionWithQuestionsHandlers,
  vivaQuestionSetHandler,
  vivaSessionHandler,
} from '../test/handlers'

const getUser = vi.fn()

vi.mock('../utils/supabase-server', () => ({
  getSupabaseServerClient: () => ({
    auth: {
      getUser,
    },
  }),
}))

// Same TanStack Start stub as -protected-routes.test.tsx: createServerFn
// needs a full Start request/response lifecycle that isn't present under
// Vitest, so this replaces it with a stub that just calls the handler
// directly, letting the real route tree's beforeLoad guards run.
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

const submissionId = '30420000-0000-0000-0000-000000000000'
const testSubmission = createTestSubmission({ id: submissionId })

describe('nested routing under /submissions/$submissionId', () => {
  beforeEach(() => {
    getUser.mockReset()
    getUser.mockResolvedValue({
      data: { user: { email: 'teacher@example.com' } },
      error: null,
    })

    server.use(
      ...submissionWithQuestionsHandlers(testSubmission, [
        createTestQuestion({ set_position: 0 }),
      ]),
      vivaQuestionSetHandler(createTestVivaQuestionSet({ status: 'ready' })),
      submissionVivaHandler([]),
      vivaSessionHandler([createTestVivaSession({ submission_id: submissionId })]),
      askedQuestionsHandler([]),
    )
  })

  it('renders the submission detail page at /submissions/$submissionId', async () => {
    const user = userEvent.setup()
    renderApp(`/submissions/${submissionId}`)

    await user.click(await screen.findByRole('tab', { name: 'Viva Questions' }))

    expect(
      await screen.findByRole('heading', { name: 'Observations and Evidence' }),
    ).toBeInTheDocument()
  })

  // Regression test: /conduct is a route nested under the pathless
  // /submissions/$submissionId layout. If that layout's component doesn't
  // render an <Outlet />, the URL changes but the parent's own page content
  // keeps showing instead of the child route's — the child never mounts.
  it('renders Conduct mode, not the submission detail page, at /submissions/$submissionId/conduct', async () => {
    renderApp(`/submissions/${submissionId}/conduct`)

    expect(await screen.findByText('Conduct mode')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Observations and Evidence' }),
    ).not.toBeInTheDocument()
  })
})
