import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { render } from '../../../test/router'
import { QuestionSetPanel } from './-QuestionSetPanel'

const baseQuestions = [
  {
    category: 'comprehension_and_accuracy',
    id: 'q1',
    label: 'Comprehension And Accuracy',
    questionText: 'Why does the response describe Lord Mansfield as pivotal?',
  },
  {
    category: 'argumentation_and_reasoning',
    id: 'q2',
    label: 'Argumentation And Reasoning',
    questionText: 'Which example gives the strongest support for your argument?',
  },
]

function renderPanel(overrides: Partial<React.ComponentProps<typeof QuestionSetPanel>> = {}) {
  const props: React.ComponentProps<typeof QuestionSetPanel> = {
    categoryBalance: {
      comprehension_and_accuracy: 1,
      argumentation_and_reasoning: 1,
      authenticity_and_ownership: 0,
    },
    estimatedDurationMinutes: 4,
    onMarkReady: vi.fn().mockResolvedValue(undefined),
    onMoveQuestionDown: vi.fn().mockResolvedValue(undefined),
    onMoveQuestionUp: vi.fn().mockResolvedValue(undefined),
    onRemoveQuestion: vi.fn().mockResolvedValue(undefined),
    onRevertToDraft: vi.fn().mockResolvedValue(undefined),
    questions: baseQuestions,
    status: 'draft',
    ...overrides,
  }

  render(<QuestionSetPanel {...props} />)

  return props
}

describe('QuestionSetPanel', () => {
  it('shows an empty state and disables Mark ready when no questions are selected', () => {
    renderPanel({ questions: [], estimatedDurationMinutes: 0 })

    expect(
      screen.getByText(
        'No questions selected yet. Add questions from the list to build your Viva Question Set.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark set ready for viva' })).toBeDisabled()
  })

  it('lists selected questions in order with position numbers', () => {
    renderPanel()

    expect(screen.getByText(/1\. Comprehension And Accuracy/)).toBeInTheDocument()
    expect(screen.getByText(/2\. Argumentation And Reasoning/)).toBeInTheDocument()
  })

  it('shows category balance counts and estimated duration', () => {
    renderPanel()

    expect(screen.getByText('4 min')).toBeInTheDocument()
    const balanceRow = screen.getByText('Comprehension And Accuracy').closest('li')
    expect(within(balanceRow as HTMLElement).getByText('1')).toBeInTheDocument()
  })

  it('disables Move up for the first question and Move down for the last question', () => {
    renderPanel()

    expect(
      screen.getByRole('button', {
        name: 'Move question up: Why does the response describe Lord Mansfield as pivotal?',
      }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', {
        name: 'Move question down: Which example gives the strongest support for your argument?',
      }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', {
        name: 'Move question down: Why does the response describe Lord Mansfield as pivotal?',
      }),
    ).toBeEnabled()
  })

  it('calls onRemoveQuestion when Remove is clicked', async () => {
    const user = userEvent.setup()
    const props = renderPanel()

    await user.click(
      screen.getByRole('button', {
        name: 'Remove question from set: Which example gives the strongest support for your argument?',
      }),
    )

    expect(props.onRemoveQuestion).toHaveBeenCalledWith('q2')
  })

  it('calls onMarkReady when the set is non-empty and Mark ready is clicked', async () => {
    const user = userEvent.setup()
    const props = renderPanel()

    await user.click(screen.getByRole('button', { name: 'Mark set ready for viva' }))

    expect(props.onMarkReady).toHaveBeenCalled()
  })

  it('shows a Ready badge and a Revert to draft action when the set is ready', async () => {
    const user = userEvent.setup()
    const props = renderPanel({ status: 'ready' })

    expect(screen.getByText('Ready for Viva')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark set ready for viva' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Revert set to draft' }))

    expect(props.onRevertToDraft).toHaveBeenCalled()
  })

  it('shows a Draft badge when the set is a draft', () => {
    renderPanel({ status: 'draft' })

    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('shows an inline error message when an action fails', async () => {
    const user = userEvent.setup()
    renderPanel({
      onMarkReady: vi.fn().mockRejectedValue(new Error('We could not mark the set ready.')),
    })

    await user.click(screen.getByRole('button', { name: 'Mark set ready for viva' }))

    expect(await screen.findByText('We could not mark the set ready.')).toBeInTheDocument()
  })
})
