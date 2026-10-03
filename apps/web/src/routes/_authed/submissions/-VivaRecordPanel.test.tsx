import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { render } from '../../../test/router'
import type { VivaRecord } from '../../../features/submissions/vivaRecord'
import { VivaRecordPanel } from './-VivaRecordPanel'

function renderPanel(record: VivaRecord | null = null) {
  const props = {
    onSaveDraft: vi.fn().mockResolvedValue(undefined),
    onSign: vi.fn().mockResolvedValue(undefined),
    record,
  }
  render(<VivaRecordPanel {...props} />)
  return props
}

describe('VivaRecordPanel', () => {
  it('offers the four conclusions with none preselected', () => {
    renderPanel()

    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(4)
    expect(radios.some((radio) => (radio as HTMLInputElement).checked)).toBe(false)
    expect(screen.getByLabelText('Authenticity concern')).toBeInTheDocument()
  })

  it('will not sign without a conclusion and explanation', async () => {
    const user = userEvent.setup()
    const props = renderPanel()

    await user.click(screen.getByRole('button', { name: 'Sign Viva Record' }))

    expect(screen.getByText('Choose a Viva Conclusion.')).toBeInTheDocument()
    expect(screen.getByText('Explain your Viva Conclusion.')).toBeInTheDocument()
    expect(props.onSign).not.toHaveBeenCalled()
  })

  it('asks for confirmation before signing', async () => {
    const user = userEvent.setup()
    const props = renderPanel()

    await user.click(screen.getByLabelText('Further review required'))
    await user.type(screen.getByLabelText('Explain your conclusion'), 'Unsure')
    await user.click(screen.getByRole('button', { name: 'Sign Viva Record' }))

    expect(props.onSign).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Confirm and sign' }))

    expect(props.onSign).toHaveBeenCalledWith({
      conclusion: 'further_review_required',
      conclusionRationale: 'Unsure',
      followUpAction: '',
    })
  })

  it('saves a draft without signing', async () => {
    const user = userEvent.setup()
    const props = renderPanel()

    await user.click(screen.getByRole('button', { name: 'Save draft' }))

    expect(props.onSaveDraft).toHaveBeenCalledTimes(1)
    expect(props.onSign).not.toHaveBeenCalled()
  })

  it('shows a signed record read-only', () => {
    renderPanel({
      conclusion: 'understanding_demonstrated',
      conclusionRationale: 'Clear grasp.',
      followUpAction: '',
      id: 'r1',
      signedAt: '2026-09-01T11:00:00Z',
      snapshot: {
        askedQuestions: [],
        questionSetId: 'set-1',
        recording: null,
        session: { endedAt: '2026-09-01T10:30:00Z', id: 's1', startedAt: '2026-09-01T10:00:00Z' },
        teacher: { id: 't1', name: 'teacher@example.com' },
      },
      status: 'signed',
      vivaSessionId: 's1',
    })

    expect(screen.getByText('Understanding demonstrated')).toBeInTheDocument()
    expect(screen.getByText(/Signed by teacher@example.com/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })
})
