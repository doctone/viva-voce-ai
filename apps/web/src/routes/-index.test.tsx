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

  describe('"How it works" section', () => {
    const stepHeadings = [
      'Submit student work',
      'AI generates tailored questions',
      'Review, edit, and record',
    ]

    it('renders all 3 steps with headings', async () => {
      renderWithRouter(<LandingPage />, '/')

      await screen.findByRole('heading', { name: 'How it works' })

      for (const heading of stepHeadings) {
        expect(
          screen.getByRole('heading', { name: heading }),
        ).toBeInTheDocument()
      }
    })

    it('gives each step a description and an image placeholder', async () => {
      renderWithRouter(<LandingPage />, '/')

      await screen.findByRole('heading', { name: 'How it works' })

      expect(
        screen.getByText(/paste or upload a student.s coursework/i),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/comprehension, argumentation, and authenticity/i),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/edit the questions, add your own, and record/i),
      ).toBeInTheDocument()

      for (const heading of stepHeadings) {
        expect(screen.getByAltText(new RegExp(heading, 'i'))).toBeInTheDocument()
      }
    })
  })

  describe('"Built for teachers" section', () => {
    const features = [
      'AI question generation mapped to real marking criteria',
      'Per-question teacher notes for what to listen for',
      'Recommended questions for time-limited vivas',
      'Audio recording and playback built in',
      'Teacher edits and adds their own questions — AI is a starting point',
    ]

    it('renders all feature bullet points', async () => {
      renderWithRouter(<LandingPage />, '/')

      await screen.findByRole('heading', { name: 'Built for teachers' })

      for (const feature of features) {
        expect(screen.getByText(feature)).toBeInTheDocument()
      }
    })
  })

  it('renders sections in order: hero, how it works, features', async () => {
    renderWithRouter(<LandingPage />, '/')

    await screen.findByRole('heading', { name: 'Built for teachers' })

    const sectionHeadings = screen
      .getAllByRole('heading')
      .filter((heading) => heading.tagName !== 'H3')
      .map((heading) => heading.textContent)

    expect(sectionHeadings).toEqual([
      'Prepare viva questions in seconds, not hours',
      'How it works',
      'Built for teachers',
    ])
  })
})
