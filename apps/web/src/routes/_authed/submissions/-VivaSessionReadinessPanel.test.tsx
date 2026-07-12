import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { render } from '../../../test/router'
import { VivaSessionReadinessPanel } from './-VivaSessionReadinessPanel'

function renderPanel(
  overrides: Partial<React.ComponentProps<typeof VivaSessionReadinessPanel>> = {},
) {
  const props: React.ComponentProps<typeof VivaSessionReadinessPanel> = {
    activeSession: null,
    estimatedDurationMinutes: 6,
    onCheckEquipment: vi.fn().mockResolvedValue('passed'),
    onStart: vi.fn().mockResolvedValue(undefined),
    questionSetStatus: 'ready',
    studentId: '10420000-0000-0000-0000-000000000000',
    submissionTitle: 'Mercantile law response',
    ...overrides,
  }

  render(<VivaSessionReadinessPanel {...props} />)

  return props
}

describe('VivaSessionReadinessPanel', () => {
  it('shows a blocking message instead of the form when the question set is a draft', () => {
    renderPanel({ questionSetStatus: 'draft' })

    expect(
      screen.getByText('Mark the Viva Question Set ready before starting a Viva Session.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Start Viva Session' }),
    ).not.toBeInTheDocument()
  })

  it('shows an in-progress summary instead of the form when a session is already active', () => {
    renderPanel({ activeSession: { startedAt: '2026-07-12T09:00:00.000Z' } })

    expect(screen.getByText('Viva Session in progress')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Start Viva Session' }),
    ).not.toBeInTheDocument()
  })

  it('disables Start Viva Session until every readiness check passes', async () => {
    const user = userEvent.setup()
    renderPanel()

    const startButton = screen.getByRole('button', { name: 'Start Viva Session' })
    expect(startButton).toBeDisabled()
    expect(
      screen.getByText('Confirm the student and submission are correct.'),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('checkbox', { name: /I've confirmed this is the correct student/ }),
    )
    expect(startButton).toBeDisabled()

    await user.click(
      screen.getByRole('radio', { name: 'Consent given to record this viva' }),
    )
    expect(startButton).toBeDisabled()
    expect(
      screen.getByText('Run the microphone check and confirm it passes.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Run microphone check' }))
    expect(await screen.findByText('Microphone check passed')).toBeInTheDocument()

    expect(startButton).toBeEnabled()
  })

  it('requires a reason when recording is disabled', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(
      screen.getByRole('checkbox', { name: /I've confirmed this is the correct student/ }),
    )
    await user.click(
      screen.getByRole('radio', { name: 'Recording is disabled for this session' }),
    )
    await user.click(screen.getByRole('button', { name: 'Run microphone check' }))
    await screen.findByText('Microphone check passed')

    expect(
      screen.getByRole('button', { name: 'Start Viva Session' }),
    ).toBeDisabled()
    expect(
      screen.getByText('Enter a reason recording is disabled.'),
    ).toBeInTheDocument()

    await user.type(
      screen.getByLabelText('Reason recording is disabled'),
      'Student has a hearing accommodation.',
    )

    expect(
      screen.getByRole('button', { name: 'Start Viva Session' }),
    ).toBeEnabled()
  })

  it('calls onStart with the recorded checklist when every check passes', async () => {
    const user = userEvent.setup()
    const props = renderPanel()

    await user.click(
      screen.getByRole('checkbox', { name: /I've confirmed this is the correct student/ }),
    )
    await user.click(
      screen.getByRole('radio', { name: 'Consent given to record this viva' }),
    )
    await user.click(screen.getByRole('button', { name: 'Run microphone check' }))
    await screen.findByText('Microphone check passed')

    await user.clear(screen.getByLabelText('Expected duration (minutes)'))
    await user.type(screen.getByLabelText('Expected duration (minutes)'), '15')
    await user.type(
      screen.getByLabelText('Accessibility adjustments (optional)'),
      'Extra processing time between questions.',
    )

    await user.click(screen.getByRole('button', { name: 'Start Viva Session' }))

    expect(props.onStart).toHaveBeenCalledWith({
      accessibilityAdjustments: 'Extra processing time between questions.',
      consentDeclinedReason: null,
      consentState: 'consent_given',
      equipmentCheckResult: 'passed',
      expectedDurationMinutes: 15,
    })
  })

  it('shows an inline error message when starting fails', async () => {
    const user = userEvent.setup()
    renderPanel({
      onStart: vi.fn().mockRejectedValue(new Error('We could not start the Viva Session.')),
    })

    await user.click(
      screen.getByRole('checkbox', { name: /I've confirmed this is the correct student/ }),
    )
    await user.click(
      screen.getByRole('radio', { name: 'Consent given to record this viva' }),
    )
    await user.click(screen.getByRole('button', { name: 'Run microphone check' }))
    await screen.findByText('Microphone check passed')

    await user.click(screen.getByRole('button', { name: 'Start Viva Session' }))

    expect(
      await screen.findByText('We could not start the Viva Session.'),
    ).toBeInTheDocument()
  })

  it('resets the form when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const props = renderPanel()

    await user.click(
      screen.getByRole('checkbox', { name: /I've confirmed this is the correct student/ }),
    )
    await user.click(
      screen.getByRole('radio', { name: 'Consent given to record this viva' }),
    )

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(
      screen.getByRole('checkbox', { name: /I've confirmed this is the correct student/ }),
    ).not.toBeChecked()
    expect(
      screen.getByRole('radio', { name: 'Consent given to record this viva' }),
    ).not.toBeChecked()
    expect(props.onStart).not.toHaveBeenCalled()
  })
})
