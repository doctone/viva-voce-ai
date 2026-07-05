import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LandingPage } from './index'
import { renderWithRouter } from '../test/router'

describe('LandingPage', () => {
  it('renders the hero headline', async () => {
    renderWithRouter(<LandingPage />, '/')

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /prepare viva questions in seconds, not hours/i,
      }),
    ).toBeInTheDocument()
  })

  it('renders a sub-headline explaining the app for KS4 English teachers', async () => {
    renderWithRouter(<LandingPage />, '/')

    expect(
      await screen.findByText(
        /turn a student.s coursework into tailored oral exam questions/i,
      ),
    ).toBeInTheDocument()
  })

  it('renders a primary CTA linking to signup', async () => {
    renderWithRouter(<LandingPage />, '/')

    expect(
      await screen.findByRole('link', { name: /get started/i }),
    ).toHaveAttribute('href', '/signup')
  })

  it('renders a screenshot placeholder with descriptive alt text', async () => {
    renderWithRouter(<LandingPage />, '/')

    expect(await screen.findByAltText(/viva voce ai/i)).toBeInTheDocument()
  })
})
