import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Login } from './Login'
import { renderWithRouter } from '../test/router'

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void

  const promise = new Promise<T>((res) => {
    resolve = res
  })

  return { promise, resolve }
}

const signInWithPassword = vi.fn()

vi.mock('../utils/supabase-server', () => ({
  getSupabaseServerClient: () => ({
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
    },
  }),
}))

// `createServerFn` normally has its client/server halves split apart by the
// TanStack Start Vite plugin, which isn't part of the Vitest pipeline. Without
// that split, calling the exported server function directly runs it through
// client-side network middleware that misreads a handler's `{ error }` return
// value as a middleware failure. Stub it so the handler runs directly instead.
vi.mock('@tanstack/react-start', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-start')>()

  return {
    ...actual,
    createServerFn: () => {
      const api: Record<string, unknown> = {
        inputValidator: () => api,
        middleware: () => api,
        handler:
          (fn: (opts: unknown) => unknown) =>
          (opts: unknown) =>
            fn(opts),
      }

      return api
    },
  }
})

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Email'), 'teacher@example.com')
  await user.type(screen.getByLabelText('Password'), 'correct-horse-battery-staple')
  await user.click(screen.getByRole('button', { name: 'Log in' }))
}

describe('Login', () => {
  it('renders email and password fields with a "Log in" button', async () => {
    renderWithRouter(<Login />, '/login')

    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument()
  })

  it('shows a link to the signup page', async () => {
    renderWithRouter(<Login />, '/login')

    expect(
      await screen.findByRole('link', { name: 'Sign up' }),
    ).toHaveAttribute('href', '/signup')
  })

  it('redirects to the submissions page after a successful login', async () => {
    signInWithPassword.mockResolvedValue({ data: {}, error: null })

    const user = userEvent.setup()

    renderWithRouter(<Login />, '/login', {
      '/submissions': <div>Submissions page</div>,
    })

    await fillAndSubmit(user)

    expect(await screen.findByText('Submissions page')).toBeInTheDocument()
  })

  it('shows an error message when credentials are invalid', async () => {
    signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: 'Invalid login credentials' },
    })

    const user = userEvent.setup()

    renderWithRouter(<Login />, '/login')

    await fillAndSubmit(user)

    expect(
      await screen.findByText('Invalid login credentials'),
    ).toBeInTheDocument()
  })

  it('shows a pending state while the login request is in flight', async () => {
    const deferred = createDeferred<{
      data: Record<string, never>
      error: null
    }>()
    signInWithPassword.mockReturnValue(deferred.promise)

    const user = userEvent.setup()

    renderWithRouter(<Login />, '/login', {
      '/submissions': <div>Submissions page</div>,
    })

    await fillAndSubmit(user)

    expect(await screen.findByRole('button', { name: 'Working' })).toBeDisabled()

    deferred.resolve({ data: {}, error: null })

    expect(await screen.findByText('Submissions page')).toBeInTheDocument()
  })
})
