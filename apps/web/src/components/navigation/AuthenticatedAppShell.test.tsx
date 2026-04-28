import { render, screen } from '@testing-library/react'
import { Outlet } from '@tanstack/react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthenticatedAppShell } from './AuthenticatedAppShell'
import { renderWithRouter } from '../../test/router'
import { getShouldShowTopbar } from '../../routes/__root'

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>(
    '@tanstack/react-router',
  )

  return {
    ...actual,
    Outlet: () => <section>Authenticated content</section>,
  }
})

describe('AuthenticatedAppShell', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the vivas placeholder panel inside the authenticated shell', async () => {
    renderWithRouter(
      <AuthenticatedAppShell>
        <section className="paper-panel section-card">
          <span className="eyebrow">Workspace</span>
          <h1>Vivas</h1>
          <p className="muted">
            Practice sessions will appear here soon.
          </p>
        </section>
      </AuthenticatedAppShell>,
      '/vivas',
    )

    expect(await screen.findByText('Viva Voce AI')).toBeInTheDocument()
    expect(screen.getByText('teacher@example.com')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vivas' })).toHaveAttribute(
      'href',
      '/vivas',
    )
    expect(screen.getByRole('link', { name: 'Logout' })).toHaveAttribute(
      'href',
      '/logout',
    )
    expect(screen.getByRole('heading', { name: 'Vivas' })).toBeInTheDocument()
    expect(screen.getByText('Workspace')).toBeInTheDocument()
    expect(
      screen.getByText('Practice sessions will appear here soon.'),
    ).toBeInTheDocument()
  })

  it('returns false for the public topbar on authenticated vivas routes', () => {
    expect(getShouldShowTopbar('/vivas', ['/__root__', '/_authed'])).toBe(false)
  })
})
