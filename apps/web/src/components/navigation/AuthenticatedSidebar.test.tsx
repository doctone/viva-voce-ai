import { act, fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthenticatedSidebar } from './AuthenticatedSidebar'
import { renderWithRouter } from '../../test/router'

describe('AuthenticatedSidebar', () => {
  it('renders the Vivas navigation item and links it to /vivas', async () => {
    renderWithRouter(
      <AuthenticatedSidebar
        items={[{ label: 'Vivas', to: '/vivas' }]}
        userEmail="teacher@example.com"
      />,
      '/vivas',
    )

    const vivasLink = await screen.findByRole('link', { name: 'Vivas' })

    expect(vivasLink).toBeInTheDocument()
    expect(vivasLink).toHaveAttribute('href', '/vivas')
  })

  it('renders the brand title and marks the current item active', async () => {
    renderWithRouter(
      <AuthenticatedSidebar
        items={[{ label: 'Vivas', to: '/vivas' }]}
        userEmail="teacher@example.com"
      />,
      '/vivas',
    )

    expect(await screen.findByText('Viva Voce AI')).toBeInTheDocument()

    const vivasLink = await screen.findByRole('link', { name: 'Vivas' })

    expect(vivasLink.className).toContain('sidebar-nav-link-active')
  })

  it('uses router navigation for sidebar links', async () => {
    renderWithRouter(
      <AuthenticatedSidebar
        items={[{ label: 'Vivas', to: '/vivas' }]}
        userEmail="teacher@example.com"
      />,
      '/',
    )

    const vivasLink = await screen.findByRole('link', { name: 'Vivas' })

    expect(vivasLink.className).not.toContain('sidebar-nav-link-active')

    await act(async () => {
      fireEvent.click(vivasLink)
    })

    expect(vivasLink.className).toContain('sidebar-nav-link-active')
  })

  it('renders the signed-in email and logout link in the sidebar footer', async () => {
    renderWithRouter(
      <AuthenticatedSidebar
        items={[{ label: 'Vivas', to: '/vivas' }]}
        userEmail="teacher@example.com"
      />,
      '/vivas',
    )

    expect(await screen.findByText('teacher@example.com')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Logout' })).toHaveAttribute(
      'href',
      '/logout',
    )
  })
})
