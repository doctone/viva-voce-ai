import { screen, within } from '@testing-library/react'
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

  describe('amending a signed record', () => {
    const signed: VivaRecord = {
      conclusion: 'further_review_required',
      conclusionRationale: 'Unsure.',
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
    }
    const amendment = {
      authorId: 't1',
      authorName: 'teacher@example.com',
      changes: [
        { field: 'conclusion' as const, from: 'further_review_required', to: 'understanding_demonstrated' },
      ],
      createdAt: '2026-09-02T09:00:00Z',
      id: 'a1',
      reason: 'Re-met the student.',
      version: 1,
    }

    it('offers no amend control to someone who cannot amend', () => {
      render(
        <VivaRecordPanel
          amendments={[]}
          canAmend={false}
          onAmend={vi.fn()}
          onSaveDraft={vi.fn()}
          onSign={vi.fn()}
          record={signed}
        />,
      )

      expect(screen.queryByRole('button', { name: 'Amend this record' })).not.toBeInTheDocument()
    })

    it('submits an amendment against the version being viewed', async () => {
      const user = userEvent.setup()
      const onAmend = vi.fn().mockResolvedValue(undefined)
      render(
        <VivaRecordPanel
          amendments={[amendment]}
          canAmend
          onAmend={onAmend}
          onSaveDraft={vi.fn()}
          onSign={vi.fn()}
          record={signed}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Amend this record' }))
      await user.click(
        within(screen.getByRole('form', { name: 'Amend Viva Record' })).getByLabelText(
          'Authenticity concern',
        ),
      )
      await user.type(screen.getByLabelText('Reason for amendment'), 'New evidence')
      await user.click(screen.getByRole('button', { name: 'Save amendment' }))

      expect(onAmend).toHaveBeenCalledWith(
        expect.objectContaining({ conclusion: 'authenticity_concern', reason: 'New evidence' }),
        1,
      )
    })

    it('shows a conflict error from the server and keeps the form open', async () => {
      const user = userEvent.setup()
      const onAmend = vi.fn().mockRejectedValue(new Error('This record was amended by someone else.'))
      render(
        <VivaRecordPanel canAmend onAmend={onAmend} onSaveDraft={vi.fn()} onSign={vi.fn()} record={signed} />,
      )

      await user.click(screen.getByRole('button', { name: 'Amend this record' }))
      await user.click(screen.getByRole('button', { name: 'Save amendment' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('amended by someone else')
      expect(screen.getByRole('form', { name: 'Amend Viva Record' })).toBeInTheDocument()
    })

    it('shows the history and lets the original signed version be viewed', async () => {
      const user = userEvent.setup()
      render(
        <VivaRecordPanel
          amendments={[amendment]}
          onSaveDraft={vi.fn()}
          onSign={vi.fn()}
          record={signed}
        />,
      )

      expect(screen.getByRole('heading', { name: 'Understanding demonstrated' })).toBeInTheDocument()
      const history = screen.getByRole('region', { name: 'Amendment history' })
      expect(history).toHaveTextContent('Version 1 by teacher@example.com')
      expect(history).toHaveTextContent('Reason: Re-met the student.')
      expect(history).toHaveTextContent(
        'Viva Conclusion: Further review required → Understanding demonstrated',
      )

      await user.click(screen.getByRole('button', { name: 'Show original signed version' }))

      expect(screen.getByRole('heading', { name: 'Further review required' })).toBeInTheDocument()
      expect(screen.getByText('Original signed version')).toBeInTheDocument()
    })
  })
})
