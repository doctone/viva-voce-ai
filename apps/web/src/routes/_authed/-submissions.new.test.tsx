import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { AppProviders } from '../../components/AppProviders'
import { VivasPage } from '../../components/vivas/VivasPage'
import { NewVivaSubmissionPage } from './submissions.new'
import { SubmissionsRouteLayout } from './submissions'
import { renderWithRouter } from '../../test/router'
import { server } from '../../test/server'

describe('NewVivaSubmissionPage', () => {
  it('requests students and renders the submission form fields', async () => {
    process.env.SUPABASE_URL = 'https://example-project.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'

    let requestedStudents = false

    server.use(
      http.get('https://example-project.supabase.co/rest/v1/students', () => {
        requestedStudents = true

        return HttpResponse.json([
          { id: '10420000-0000-0000-0000-000000000000' },
        ])
      }),
    )

    renderWithRouter(<NewVivaSubmissionPage />, '/submissions/new')

    await waitFor(() => {
      expect(requestedStudents).toBe(true)
    })

    expect(
      screen.getByRole('heading', { name: 'New submission' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Student')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Submission text')).toBeInTheDocument()
    expect(
      await screen.findByRole('option', {
        name: '10420000-0000-0000-0000-000000000000',
      }),
    ).toBeInTheDocument()
  })

  it('updates the advisory word count as the submission text changes', async () => {
    process.env.SUPABASE_URL = 'https://example-project.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'

    server.use(
      http.get('https://example-project.supabase.co/rest/v1/students', () => {
        return HttpResponse.json([
          { id: '10420000-0000-0000-0000-000000000000' },
        ])
      }),
    )

    const user = userEvent.setup()

    renderWithRouter(<NewVivaSubmissionPage />, '/submissions/new')

    const textArea = await screen.findByLabelText('Submission text')

    await user.type(textArea, 'One two three four')

    expect(
      screen.getByText('4 words, guidance: around 400.'),
    ).toBeInTheDocument()
  })

  it('creates the submission and redirects back to the submissions list', async () => {
    process.env.SUPABASE_URL = 'https://example-project.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'

    let postedBody: Record<string, unknown> | undefined

    server.use(
      http.get('https://example-project.supabase.co/rest/v1/students', () => {
        return HttpResponse.json([
          { id: '10420000-0000-0000-0000-000000000000' },
        ])
      }),
      http.post(
        'https://example-project.supabase.co/rest/v1/submissions',
        async ({ request }) => {
          postedBody = (await request.json()) as Record<string, unknown>

          return HttpResponse.json(
            { id: '30420000-0000-0000-0000-000000000000' },
            { status: 201 },
          )
        },
      ),
      http.get('https://example-project.supabase.co/rest/v1/submissions', () => {
        return HttpResponse.json([])
      }),
    )

    const user = userEvent.setup()

    renderWithRouter(<NewVivaSubmissionPage />, '/submissions/new', {
      '/submissions': <div>Submissions index</div>,
    })

    await screen.findByRole('option', {
      name: '10420000-0000-0000-0000-000000000000',
    })

    await user.selectOptions(
      await screen.findByLabelText('Student'),
      '10420000-0000-0000-0000-000000000000',
    )
    await user.type(screen.getByLabelText('Title'), 'Economic policy reflection')
    await user.type(
      screen.getByLabelText('Submission text'),
      'This submission examines monetary policy and public argument.',
    )
    await user.click(
      screen.getByRole('button', { name: 'Generate viva questions' }),
    )

    await waitFor(() => {
      expect(postedBody).toEqual({
        student_id: '10420000-0000-0000-0000-000000000000',
        submission_title: 'Economic policy reflection',
        submission_text:
          'This submission examines monetary policy and public argument.',
      })
    })

    expect(await screen.findByText('Submissions index')).toBeInTheDocument()
  })

  it('shows an inline error when submission creation fails', async () => {
    process.env.SUPABASE_URL = 'https://example-project.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'

    server.use(
      http.get('https://example-project.supabase.co/rest/v1/students', () => {
        return HttpResponse.json([
          { id: '10420000-0000-0000-0000-000000000000' },
        ])
      }),
      http.post('https://example-project.supabase.co/rest/v1/submissions', () => {
        return HttpResponse.json({ message: 'Insert failed' }, { status: 500 })
      }),
    )

    const user = userEvent.setup()

    renderWithRouter(<NewVivaSubmissionPage />, '/submissions/new')

    await screen.findByRole('option', {
      name: '10420000-0000-0000-0000-000000000000',
    })

    await user.selectOptions(
      await screen.findByLabelText('Student'),
      '10420000-0000-0000-0000-000000000000',
    )
    await user.type(screen.getByLabelText('Title'), 'Economic policy reflection')
    await user.type(
      screen.getByLabelText('Submission text'),
      'Short text for failure path.',
    )
    await user.click(
      screen.getByRole('button', { name: 'Generate viva questions' }),
    )

    expect(
      await screen.findByText(
        'We could not create the submission. Please try again.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'New submission' }),
    ).toBeInTheDocument()
  })

  it('renders the child route content at /submissions/new instead of the submissions index', async () => {
    process.env.SUPABASE_URL = 'https://example-project.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'

    server.use(
      http.get('https://example-project.supabase.co/rest/v1/students', () => {
        return HttpResponse.json([
          { id: '10420000-0000-0000-0000-000000000000' },
        ])
      }),
    )

    const rootRoute = createRootRoute({
      component: Outlet,
    })
    const submissionsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/submissions',
      component: SubmissionsRouteLayout,
    })
    const submissionsIndexRoute = createRoute({
      getParentRoute: () => submissionsRoute,
      path: '/',
      component: VivasPage,
    })
    const submissionsNewRoute = createRoute({
      getParentRoute: () => submissionsRoute,
      path: '/new',
      component: NewVivaSubmissionPage,
    })
    const routeTree = rootRoute.addChildren([
      submissionsRoute.addChildren([submissionsIndexRoute, submissionsNewRoute]),
    ])
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/submissions/new'] }),
    })

    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )

    expect(
      await screen.findByRole('heading', { name: 'New submission' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Submissions' }),
    ).not.toBeInTheDocument()
  })
})
