import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { render } from '../../../test/router'
import { buildRecordPageModel } from '../../../features/submissions/vivaRecordPage'
import { makeSignedRecord } from '../../../features/submissions/vivaRecordPage.fixture'
import { VivaRecordPage } from './-VivaRecordPage'

const context = { studentName: 'Sam Lee', submissionTitle: 'Poetry defence' }

describe('VivaRecordPage', () => {
  it('renders a 12-question viva (10 + 2 follow-ups) on a single page from the record data', () => {
    const record = makeSignedRecord(10, 2)
    render(
      <VivaRecordPage
        model={buildRecordPageModel(record, { ...context, talkTimeSharePercent: 42 })}
        state="signed"
      />,
    )

    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(
      screen.getByRole('heading', { name: 'Sam Lee — Poetry defence' }),
    ).toBeInTheDocument()

    expect(screen.getByText('25 min 30 s')).toBeInTheDocument()
    expect(screen.getByText('10 + 2 follow-ups')).toBeInTheDocument()
    expect(screen.getByText('Attached')).toBeInTheDocument()
    expect(screen.getByText('42%')).toBeInTheDocument()

    for (const q of record.snapshot.askedQuestions) {
      const row = screen.getByText(`${q.questionText}`, { exact: false, selector: 'p' })
      expect(row).toBeInTheDocument()
      expect(screen.getByText(q.observation!.content, { exact: false, selector: 'p' })).toBeInTheDocument()
    }

    expect(screen.getByText('Explanation:').parentElement).toHaveTextContent(
      record.conclusionRationale,
    )
    expect(screen.getByText('Signed record')).toBeInTheDocument()
    expect(screen.getByText('Ms Patel')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument()
  })

  it('shows all four conclusions with only the chosen one selected', () => {
    render(
      <VivaRecordPage
        model={buildRecordPageModel(makeSignedRecord(2, 0), context)}
        state="signed"
      />,
    )
    const list = screen.getByRole('region', { name: 'Viva Conclusion' })

    expect(within(list).getAllByRole('listitem')).toHaveLength(4)
    expect(within(list).getAllByText('(selected)', { exact: false })).toHaveLength(1)
    expect(within(list).getByText(/Further review required/)).toHaveTextContent(
      '(selected)',
    )
  })

  it('leaves talk time out when there is no speaker data', () => {
    render(
      <VivaRecordPage
        model={buildRecordPageModel(makeSignedRecord(2, 0), context)}
        state="signed"
      />,
    )

    expect(screen.queryByText(/Talk time/)).not.toBeInTheDocument()
  })

  it('overflows a long viva onto labelled pages, repeats the header and signs only the last', () => {
    render(
      <VivaRecordPage
        model={buildRecordPageModel(makeSignedRecord(20, 0), context)}
        state="signed"
      />,
    )
    const pages = screen.getAllByRole('article')

    expect(pages).toHaveLength(2)
    expect(within(pages[1]).getByText('Sam Lee — Poetry defence')).toBeInTheDocument()
    expect(within(pages[1]).getByText(/Continued, page 2 of 2/)).toBeInTheDocument()
    expect(within(pages[0]).queryByText('Signed record')).not.toBeInTheDocument()
    expect(within(pages[1]).getByText('Signed record')).toBeInTheDocument()
  })

  it('marks amended records with the amendment date', () => {
    render(
      <VivaRecordPage
        model={buildRecordPageModel(makeSignedRecord(2, 0), {
          ...context,
          amendments: [
            {
              authorId: 't1',
              authorName: 'Ms Patel',
              changes: [],
              createdAt: '2026-05-03T09:00:00.000Z',
              id: 'a1',
              reason: 'r',
              version: 1,
            },
          ],
        })}
        state="signed"
      />,
    )

    expect(screen.getByText('Signed record · Amended')).toBeInTheDocument()
    expect(screen.getByText(/Amended 3 May 2026/)).toBeInTheDocument()
  })

  it('shows Not yet signed instead of a record for unsigned sessions', () => {
    render(<VivaRecordPage state="unsigned" />)

    expect(screen.getByRole('heading', { name: 'Not yet signed' })).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })
})
