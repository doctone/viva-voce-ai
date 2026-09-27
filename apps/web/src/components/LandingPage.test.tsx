import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LandingPage } from './LandingPage'
import { renderWithRouter } from '../test/router'

describe('LandingPage', () => {
  describe('hero section', () => {
    it('renders a headline communicating the core value proposition', async () => {
      renderWithRouter(<LandingPage />, '/')

      expect(
        await screen.findByRole('heading', {
          name: 'Prepare viva questions in seconds, not hours',
        }),
      ).toBeInTheDocument()
    })

    it('renders a one-line sub-headline explaining what the app does', async () => {
      renderWithRouter(<LandingPage />, '/')

      expect(
        await screen.findByText(
          /turns a student.s coursework into a short, recorded viva/i,
        ),
      ).toBeInTheDocument()
    })

    it('renders a primary CTA linking to signup', async () => {
      renderWithRouter(<LandingPage />, '/')

      const cta = await screen.findByRole('link', { name: 'Get started' })
      expect(cta).toHaveAttribute('href', '/signup')
    })
  })

  describe('film', () => {
    it('hosts the film, served in byte ranges, with its poster', async () => {
      renderWithRouter(<LandingPage />, '/')

      const film = await screen.findByLabelText('The Viva Voce AI film')
      expect(film).toHaveAttribute('src', '/film.mp4')
      expect(film).toHaveAttribute(
        'poster',
        '/media/viva-voce-ai-film-poster.jpg',
      )
    })

    it('replaces the written explainer sections with the film', async () => {
      renderWithRouter(<LandingPage />, '/')

      await screen.findByLabelText('The Viva Voce AI film')

      expect(
        screen.queryByRole('heading', { name: /why viva voce matters/i }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('list', { name: 'Built for teachers' }),
      ).not.toBeInTheDocument()
    })
  })

  describe('social proof callout', () => {
    it('is visible on the page', async () => {
      renderWithRouter(<LandingPage />, '/')

      expect(
        await screen.findByText(/piloting with KS4 English departments/i),
      ).toBeInTheDocument()
    })
  })

  describe('final CTA', () => {
    it('renders a closing CTA button linking to signup', async () => {
      renderWithRouter(<LandingPage />, '/')

      const cta = await screen.findByRole('link', { name: 'Request access' })
      expect(cta).toHaveAttribute('href', '/signup')
    })
  })

  describe('section order', () => {
    it('renders the hero, then the film and its chapters, then the final CTA', async () => {
      renderWithRouter(<LandingPage />, '/')

      const hero = await screen.findByRole('heading', {
        name: 'Prepare viva questions in seconds, not hours',
      })
      const heroCta = screen.getByRole('link', { name: 'Get started' })
      const film = screen.getByLabelText('The Viva Voce AI film')
      const chapters = screen.getByRole('list', { name: 'How it works' })
      const finalCta = screen.getByRole('link', { name: 'Request access' })

      const positions = [hero, heroCta, film, chapters, finalCta]
      for (let i = 0; i < positions.length - 1; i++) {
        expect(
          positions[i].compareDocumentPosition(positions[i + 1]) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy()
      }
    })
  })
})
