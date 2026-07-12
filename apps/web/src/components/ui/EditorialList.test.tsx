import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EditorialList, EditorialListItem } from './EditorialList'

describe('EditorialList', () => {
  it('renders a divided list with its rows', () => {
    render(
      <EditorialList aria-label="Built for teachers">
        <EditorialListItem>Feature one</EditorialListItem>
        <EditorialListItem>Feature two</EditorialListItem>
      </EditorialList>,
    )

    const list = screen.getByRole('list', { name: 'Built for teachers' })

    expect(list.className).toContain('divide-y')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('merges a custom className onto the list', () => {
    render(<EditorialList aria-label="list" className="max-w-[42rem]" />)

    expect(screen.getByRole('list', { name: 'list' }).className).toContain('max-w-[42rem]')
  })
})
