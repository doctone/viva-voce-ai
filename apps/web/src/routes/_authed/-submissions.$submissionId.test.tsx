import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { SubmissionDetailPage } from './submissions.$submissionId'
import { renderWithRouter } from '../../test/router'
import { server } from '../../test/server'

describe('SubmissionDetailPage', () => {
  it('renders the submission, placeholder questions, and oral examination panel', async () => {
    server.use(
      http.get('https://example-project.supabase.co/rest/v1/submissions', ({ request }) => {
        const url = new URL(request.url)

        expect(url.searchParams.get('id')).toBe('eq.30420000-0000-0000-0000-000000000000')

        return HttpResponse.json([
          {
            id: '30420000-0000-0000-0000-000000000000',
            student_id: '10420000-0000-0000-0000-000000000000',
            submission_title: 'Mercantile law response',
            submission_text:
              'The evolution of mercantile law in the 18th century represents a pivotal shift from localized guild regulations to a more formalized system of international trade governance.',
            created_at: '2026-04-30T20:00:00.000Z',
          },
        ])
      }),
      http.get('https://example-project.supabase.co/rest/v1/submission_questions', () => {
        return HttpResponse.json([
          {
            id: '40420000-0000-0000-0000-000000000000',
            submission_id: '30420000-0000-0000-0000-000000000000',
            category: 'comprehension',
            question_text: 'Why does the response describe Lord Mansfield as pivotal?',
            teacher_note: 'Listen for understanding of legal reform and why it mattered.',
            created_at: '2026-04-30T20:05:00.000Z',
          },
          {
            id: '40420000-0000-0000-0000-000000000001',
            submission_id: '30420000-0000-0000-0000-000000000000',
            category: 'authenticity',
            question_text: 'Which sentence took the longest to shape, and what were you trying to achieve?',
            teacher_note: 'Listen for drafting choices tied to the actual wording.',
            created_at: '2026-04-30T20:06:00.000Z',
          },
        ])
      }),
    )

    renderWithRouter(
      <SubmissionDetailPage />,
      '/submissions/30420000-0000-0000-0000-000000000000',
    )

    expect(await screen.findByRole('heading', { name: 'The Submission' })).toBeInTheDocument()
    expect(screen.getByText('Mercantile law response')).toBeInTheDocument()
    expect(
      screen.getByText(/The evolution of mercantile law in the 18th century/),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('heading', { name: 'Oral Examination \(Audio\)' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'AI Viva Strategy' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Upload the recorded Viva Voce session to generate an automated transcription and analysis\./),
    ).toBeInTheDocument()

    expect(screen.getByText('Why does the response describe Lord Mansfield as pivotal?')).toBeInTheDocument()
    expect(
      screen.getByText('Which sentence took the longest to shape, and what were you trying to achieve?'),
    ).toBeInTheDocument()
  })
})
