import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Login } from './Login'
import { renderWithRouter } from '../test/router'

vi.mock('../routes/_authed', () => ({
  loginFn: vi.fn(),
}))

const { loginFn } = await import('../routes/_authed')
const mockedLoginFn = vi.mocked(loginFn)

describe('Login', () => {
  it('renders email and password fields with a Login button', async () => {
    renderWithRouter(<Login />, '/login')

    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
  })

  it('shows a link to the signup page', async () => {
    renderWithRouter(<Login />, '/login')

    const signupLink = await screen.findByRole('link', { name: 'Sign up' })

    expect(signupLink).toBeInTheDocument()
    expect(signupLink).toHaveAttribute('href', '/signup')
  })

  it('redirects to the submissions page on successful login', async () => {
    mockedLoginFn.mockResolvedValueOnce(undefined)

    const user = userEvent.setup()

    renderWithRouter(<Login />, '/login', {
      '/submissions': <div>Submissions page</div>,
    })

    await user.type(await screen.findByLabelText('Email'), 'teacher@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(await screen.findByText('Submissions page')).toBeInTheDocument()
  })

  it('shows an error message on invalid credentials', async () => {
    mockedLoginFn.mockResolvedValueOnce({
      error: true,
      message: 'Invalid login credentials',
    })

    const user = userEvent.setup()

    renderWithRouter(<Login />, '/login')

    await user.type(await screen.findByLabelText('Email'), 'teacher@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument()
  })

  it('shows a pending state while the login request is in flight', async () => {
    let resolveLogin: (value: undefined) => void = () => {}
    mockedLoginFn.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLogin = resolve
      }),
    )

    const user = userEvent.setup()

    renderWithRouter(<Login />, '/login')

    await user.type(await screen.findByLabelText('Email'), 'teacher@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(await screen.findByRole('button', { name: 'Working' })).toBeDisabled()

    resolveLogin(undefined)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
    })
  })
})
