import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '../../../test/router'
import {
  VivaSessionCapturePanel,
  type CaptureAskedQuestion,
} from './-VivaSessionCapturePanel'

function renderPanel(
  overrides: Partial<React.ComponentProps<typeof VivaSessionCapturePanel>> = {},
) {
  const props: React.ComponentProps<typeof VivaSessionCapturePanel> = {
    askedQuestions: [],
    onApplyEvidenceMarker: vi.fn().mockResolvedValue(undefined),
    onAskFollowUpQuestion: vi.fn().mockResolvedValue(undefined),
    onAskPlannedQuestion: vi.fn().mockResolvedValue(undefined),
    onSaveObservation: vi.fn().mockResolvedValue(undefined),
    plannedQuestions: [],
    ...overrides,
  }

  render(<VivaSessionCapturePanel {...props} />)

  return props
}

function askedQuestion(
  overrides: Partial<CaptureAskedQuestion> = {},
): CaptureAskedQuestion {
  return {
    evidenceMarker: null,
    id: 'asked-question-1',
    isUnplanned: false,
    observation: null,
    questionText: 'Why does the response describe Lord Mansfield as pivotal?',
    vivaQuestionId: 'question-1',
    ...overrides,
  }
}

describe('VivaSessionCapturePanel', () => {
  it('lists planned questions that have not been asked yet', () => {
    renderPanel({
      plannedQuestions: [{ id: 'question-1', questionText: 'Why is this pivotal?' }],
    })

    expect(screen.getByText('Why is this pivotal?')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Mark as asked' }),
    ).toBeInTheDocument()
  })

  it('marks a planned question as asked', async () => {
    const user = userEvent.setup()
    const props = renderPanel({
      plannedQuestions: [{ id: 'question-1', questionText: 'Why is this pivotal?' }],
    })

    await user.click(screen.getByRole('button', { name: 'Mark as asked' }))

    expect(props.onAskPlannedQuestion).toHaveBeenCalledWith('question-1')
  })

  it('records an unplanned follow-up question, operable by keyboard', async () => {
    const user = userEvent.setup()
    const props = renderPanel()

    const followUpInput = screen.getByLabelText('Unplanned follow-up question')
    await user.click(followUpInput)
    await user.keyboard('Can you say more about that?')
    await user.keyboard('{Tab}')
    await user.keyboard('{Enter}')

    expect(props.onAskFollowUpQuestion).toHaveBeenCalledWith(
      'Can you say more about that?',
    )
  })

  it('disables recording a follow-up question until text is entered', () => {
    renderPanel()

    expect(
      screen.getByRole('button', { name: 'Record follow-up as asked' }),
    ).toBeDisabled()
  })

  it('shows an inline error when recording a question fails', async () => {
    const user = userEvent.setup()
    renderPanel({
      onAskPlannedQuestion: vi
        .fn()
        .mockRejectedValue(new Error('We could not record that question as asked.')),
      plannedQuestions: [{ id: 'question-1', questionText: 'Why is this pivotal?' }],
    })

    await user.click(screen.getByRole('button', { name: 'Mark as asked' }))

    expect(
      await screen.findByText('We could not record that question as asked.'),
    ).toBeInTheDocument()
  })

  it('selects the most recently asked question by default', () => {
    renderPanel({
      askedQuestions: [
        askedQuestion({ id: 'asked-question-1', questionText: 'First question' }),
        askedQuestion({ id: 'asked-question-2', questionText: 'Second question' }),
      ],
    })

    expect(
      screen.getByRole('button', { name: 'Second question' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByLabelText(/Observation/),
    ).toBeInTheDocument()
  })

  it('lets the teacher select a different asked question to amend it', async () => {
    const user = userEvent.setup()
    renderPanel({
      askedQuestions: [
        askedQuestion({
          id: 'asked-question-1',
          observation: { content: 'Confident opening.' },
          questionText: 'First question',
        }),
        askedQuestion({ id: 'asked-question-2', questionText: 'Second question' }),
      ],
    })

    await user.click(screen.getByRole('button', { name: 'First question' }))

    expect(
      screen.getByRole('button', { name: 'First question' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText(/Observation/)).toHaveValue('Confident opening.')
  })
})

describe('AskedQuestionCaptureCard evidence markers', () => {
  it('applies an Evidence Marker, keyboard-operable, and highlights the active one', async () => {
    const user = userEvent.setup()
    const props = renderPanel({
      askedQuestions: [askedQuestion()],
    })

    await user.tab()
    await user.tab()
    await user.tab()
    await user.tab()
    const needsProbingButton = screen.getByRole('button', {
      name: 'Needs further probing',
    })
    expect(needsProbingButton).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(props.onApplyEvidenceMarker).toHaveBeenCalledWith(
      'asked-question-1',
      'needs_further_probing',
    )
  })

  it('shows the currently applied Evidence Marker as active', () => {
    renderPanel({
      askedQuestions: [
        askedQuestion({ evidenceMarker: { markerType: 'concern' } }),
      ],
    })

    expect(screen.getByRole('button', { name: 'Concern' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('shows an inline error when applying an Evidence Marker fails', async () => {
    const user = userEvent.setup()
    renderPanel({
      askedQuestions: [askedQuestion()],
      onApplyEvidenceMarker: vi
        .fn()
        .mockRejectedValue(new Error('We could not save the Evidence Marker.')),
    })

    await user.click(screen.getByRole('button', { name: 'Concern' }))

    expect(
      await screen.findByText('We could not save the Evidence Marker.'),
    ).toBeInTheDocument()
  })
})

describe('AskedQuestionCaptureCard observation autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('autosaves the Observation after the teacher stops typing', async () => {
    const user = userEvent.setup({ delay: null })
    const props = renderPanel({ askedQuestions: [askedQuestion()] })

    await user.type(screen.getByLabelText(/Observation/), 'Confident answer.')

    expect(props.onSaveObservation).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(props.onSaveObservation).toHaveBeenCalledWith(
      'asked-question-1',
      'Confident answer.',
    )
    expect(await screen.findByText('Saved')).toBeInTheDocument()
  })

  it('shows a retry option after a temporary network failure and recovers', async () => {
    const user = userEvent.setup({ delay: null })
    const onSaveObservation = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(undefined)
    renderPanel({
      askedQuestions: [askedQuestion()],
      onSaveObservation,
    })

    await user.type(screen.getByLabelText(/Observation/), 'Confident answer.')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(
      await screen.findByText("We couldn't save your Observation."),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('Saved')).toBeInTheDocument()
    expect(onSaveObservation).toHaveBeenCalledTimes(2)
  })

  it('never reports an Observation as saved while it is still unsaved', async () => {
    const user = userEvent.setup({ delay: null })
    renderPanel({ askedQuestions: [askedQuestion()] })

    await user.type(screen.getByLabelText(/Observation/), 'First thought.')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(await screen.findByText('Saved')).toBeInTheDocument()

    // Typing again must retract the claim immediately, not leave "Saved"
    // standing over text that has not been written yet.
    await user.type(screen.getByLabelText(/Observation/), ' Second thought.')

    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
  })

  it('saves a pending Observation when the teacher moves to another asked question', async () => {
    const user = userEvent.setup({ delay: null })
    const props = renderPanel({
      askedQuestions: [
        askedQuestion({ id: 'asked-question-1', questionText: 'First question' }),
        askedQuestion({ id: 'asked-question-2', questionText: 'Second question' }),
      ],
    })

    await user.click(screen.getByRole('button', { name: 'First question' }))
    await user.type(screen.getByLabelText(/Observation/), 'Hesitant on sources.')

    // Switching unmounts the card mid-debounce. The edit must survive.
    await user.click(screen.getByRole('button', { name: 'Second question' }))

    await waitFor(() => {
      expect(props.onSaveObservation).toHaveBeenCalledWith(
        'asked-question-1',
        'Hesitant on sources.',
      )
    })
  })
})
