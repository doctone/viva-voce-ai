import { screen, within } from '@testing-library/react'
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

    it('renders a sub-headline explaining what the app does', async () => {
      renderWithRouter(<LandingPage />, '/')

      expect(
        await screen.findByText(/tailored oral exam questions/i),
      ).toBeInTheDocument()
    })

    it('renders a primary CTA linking to signup', async () => {
      renderWithRouter(<LandingPage />, '/')

      const cta = await screen.findByRole('link', { name: 'Get started' })
      expect(cta).toHaveAttribute('href', '/signup')
    })

    it('renders a screenshot placeholder with descriptive alt text', async () => {
      renderWithRouter(<LandingPage />, '/')

      expect(
        await screen.findByAltText(/screenshot of the viva voce ai/i),
      ).toBeInTheDocument()
    })
  })

  describe('how it works section', () => {
    it('renders all 3 steps with headings', async () => {
      renderWithRouter(<LandingPage />, '/')

      expect(
        await screen.findByRole('heading', { name: 'Submit student work' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('heading', {
          name: 'AI generates tailored questions',
        }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: 'Review, edit, and record' }),
      ).toBeInTheDocument()
    })

    it('gives each step a description', async () => {
      renderWithRouter(<LandingPage />, '/')

      await screen.findByRole('heading', { name: 'Submit student work' })

      expect(screen.getByText(/paste or upload/i)).toBeInTheDocument()
      expect(screen.getByText(/questions across comprehension/i)).toBeInTheDocument()
      expect(screen.getByText(/edit any question/i)).toBeInTheDocument()
    })

    it('numbers the steps in the order they happen', async () => {
      renderWithRouter(<LandingPage />, '/')

      const steps = within(
        await screen.findByRole('list', { name: 'How it works' }),
      ).getAllByRole('listitem')

      expect(steps).toHaveLength(3)
      expect(steps[0]).toHaveTextContent('Step 01')
      expect(steps[0]).toHaveTextContent('Submit student work')
      expect(steps[2]).toHaveTextContent('Step 03')
      expect(steps[2]).toHaveTextContent('Review, edit, and record')
    })
  })

  describe('features section', () => {
    it('renders all feature bullet points', async () => {
      renderWithRouter(<LandingPage />, '/')

      const featuresList = await screen.findByRole('list', {
        name: 'Built for teachers',
      })
      const items = within(featuresList).getAllByRole('listitem')

      expect(items).toHaveLength(5)
      expect(
        within(featuresList).getByText(
          /AI question generation mapped to real marking criteria/i,
        ),
      ).toBeInTheDocument()
      expect(
        within(featuresList).getByText(
          /Per-question teacher notes for what to listen for/i,
        ),
      ).toBeInTheDocument()
      expect(
        within(featuresList).getByText(
          /Recommended questions for time-limited vivas/i,
        ),
      ).toBeInTheDocument()
      expect(
        within(featuresList).getByText(
          /Audio recording and playback built in/i,
        ),
      ).toBeInTheDocument()
      expect(
        within(featuresList).getByText(
          /Teacher edits and adds their own questions/i,
        ),
      ).toBeInTheDocument()
    })
  })

  describe('why viva voce section', () => {
    it('renders an explainer for why oral examination matters now', async () => {
      renderWithRouter(<LandingPage />, '/')

      expect(
        await screen.findByRole('heading', { name: /why viva voce matters/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/verify a student.s own understanding/i),
      ).toBeInTheDocument()
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
    it('renders sections in order: hero, how it works, features, why viva, final CTA', async () => {
      renderWithRouter(<LandingPage />, '/')

      const hero = await screen.findByRole('heading', {
        name: 'Prepare viva questions in seconds, not hours',
      })
      const howItWorks = screen.getByRole('heading', {
        name: 'Submit student work',
      })
      const features = screen.getByRole('list', { name: 'Built for teachers' })
      const whyViva = screen.getByRole('heading', {
        name: /why viva voce matters/i,
      })
      const finalCta = screen.getByRole('link', { name: 'Request access' })

      const positions = [hero, howItWorks, features, whyViva, finalCta]
      for (let i = 0; i < positions.length - 1; i++) {
        expect(
          positions[i].compareDocumentPosition(positions[i + 1]) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy()
      }
    })
  })
})
