import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LandingPage } from './LandingPage'
import { renderWithRouter } from '../test/router'

describe('LandingPage', () => {
  it('renders the hero headline and sub-headline', async () => {
    renderWithRouter(<LandingPage />, '/')

    expect(
      await screen.findByRole('heading', {
        name: 'Prepare viva questions in seconds, not hours',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/tailored oral exam questions/i),
    ).toBeInTheDocument()
  })

  it('renders a primary CTA linking to signup', async () => {
    renderWithRouter(<LandingPage />, '/')

    expect(
      await screen.findByRole('link', { name: 'Get started' }),
    ).toHaveAttribute('href', '/signup')
  })

  it('renders a screenshot placeholder with descriptive alt text', async () => {
    renderWithRouter(<LandingPage />, '/')

    expect(
      await screen.findByAltText(
        'Screenshot of the Viva Voce AI question generation workspace',
      ),
    ).toBeInTheDocument()
  })
})
