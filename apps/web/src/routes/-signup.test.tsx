import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Signup } from './signup'
import { renderWithRouter } from '../test/router'

const signUp = vi.fn()

vi.mock('../utils/supabase-server', () => ({
  getSupabaseServerClient: () => ({
    auth: {
      signUp: (...args: unknown[]) => signUp(...args),
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
  await user.click(screen.getByRole('button', { name: 'Sign up' }))
}

describe('Signup', () => {
  it('renders email and password fields with a "Sign up" button', async () => {
    renderWithRouter(<Signup />, '/signup')

    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument()
  })

  it('shows a link to the login page', async () => {
    renderWithRouter(<Signup />, '/signup')

    expect(
      await screen.findByRole('link', { name: 'Log in' }),
    ).toHaveAttribute('href', '/login')
  })

  it('creates the account and redirects after a successful signup', async () => {
    signUp.mockResolvedValue({ data: {}, error: null })

    const user = userEvent.setup()

    renderWithRouter(<Signup />, '/signup', {
      '/': <div>Home page</div>,
    })

    await fillAndSubmit(user)

    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })

  it('shows an error message when signup fails for a duplicate account', async () => {
    signUp.mockResolvedValue({
      data: {},
      error: { message: 'User already registered' },
    })

    const user = userEvent.setup()

    renderWithRouter(<Signup />, '/signup')

    await fillAndSubmit(user)

    expect(
      await screen.findByText('User already registered'),
    ).toBeInTheDocument()
  })
})
