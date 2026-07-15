import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StudentRecordsPage } from './student-records'

describe('StudentRecordsPage', () => {
  it('renders a page title and a designed empty state', () => {
    render(<StudentRecordsPage />)

    expect(screen.getByRole('heading', { name: 'Student Records' })).toBeInTheDocument()
    expect(screen.getByText('No student records yet')).toBeInTheDocument()
    expect(
      screen.getByText(/Student records will appear here once a submission has been reviewed/),
    ).toBeInTheDocument()
  })
})
