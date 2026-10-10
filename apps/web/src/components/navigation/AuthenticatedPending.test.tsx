import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithRouter } from '../../test/router'
import { AuthenticatedPending } from './AuthenticatedPending'

describe('AuthenticatedPending', () => {
  it('shows the app navigation and a loading status without a fake account', async () => {
    renderWithRouter(<AuthenticatedPending />, '/')

    expect(await screen.findAllByRole('link', { name: 'Submissions' })).not.toHaveLength(0)
    expect(screen.getByRole('status')).toHaveTextContent('Loading your workspace')
    expect(screen.queryByText('teacher@example.com')).not.toBeInTheDocument()
  })
})
