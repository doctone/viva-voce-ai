import * as React from 'react'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { isRedirect, redirect, useRouter } from '@tanstack/react-router'
import { describe, expect, it, vi } from 'vitest'
import { SignupComp } from './signup'
import { renderWithRouter } from '../test/router'

const mockedSignupCall = vi.fn()

// signupFn relies on `getSupabaseServerClient`'s cookie access, which only
// works inside a real request context, and on the createServerFn RPC
// envelope (only wired up by the production Vite transform) to keep an
// application-level `{ error: true }` payload from being mistaken for a
// framework-level thrown error. Neither is available under Vitest, so we
// replace `useServerFn` with a re-implementation that keeps its real
// redirect-to-navigation behaviour but swaps the network call for a mock.
vi.mock('@tanstack/react-start', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-start')>()

  return {
    ...actual,
    useServerFn: () => {
      const router = useRouter()

      return React.useCallback(
        async (...args: unknown[]) => {
          try {
            const res = await mockedSignupCall(...args)
            if (isRedirect(res)) throw res
            return res
          } catch (err) {
            if (isRedirect(err)) {
              return router.navigate(router.resolveRedirect(err).options)
            }
            throw err
          }
        },
        [router],
      )
    },
  }
})

describe('SignupComp', () => {
  it('renders email and password fields with a Sign Up button', async () => {
    renderWithRouter(<SignupComp />, '/signup')

    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument()
  })

  it('shows a link to the login page', async () => {
    renderWithRouter(<SignupComp />, '/signup')

    const loginLink = await screen.findByRole('link', { name: 'Log in' })

    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute('href', '/login')
  })

  it('creates the account and redirects on success', async () => {
    mockedSignupCall.mockRejectedValueOnce(redirect({ href: '/' }))

    const user = userEvent.setup()

    renderWithRouter(<SignupComp />, '/signup', {
      '/': <div>Home page</div>,
    })

    await user.type(await screen.findByLabelText('Email'), 'teacher@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))

    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })

  it('shows an error message on invalid or duplicate credentials', async () => {
    mockedSignupCall.mockResolvedValueOnce({
      error: true,
      message: 'A user with this email address has already been registered',
    })

    const user = userEvent.setup()

    renderWithRouter(<SignupComp />, '/signup')

    await user.type(await screen.findByLabelText('Email'), 'teacher@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign Up' }))

    expect(
      await screen.findByText('A user with this email address has already been registered'),
    ).toBeInTheDocument()
  })
})
