import { describe, expect, it } from 'vitest'
import {
  compareSubmissionStatus,
  countSubmissionsByStatus,
  filterSubmissions,
  type SubmissionRow,
} from './-submission'

function createRow(overrides: Partial<SubmissionRow> = {}): SubmissionRow {
  return {
    id: '30420000-0000-0000-0000-000000000000',
    studentId: 'STU-1042',
    submissionTitle: 'Modernist Poetry Oral Defence',
    dateSubmitted: '12 Mar 2026',
    submittedAt: '2026-03-12T09:00:00.000Z',
    status: 'pending',
    ...overrides,
  }
}

const rows: SubmissionRow[] = [
  createRow({ id: 'a', studentId: 'STU-1042', status: 'pending' }),
  createRow({
    id: 'b',
    studentId: 'STU-1098',
    submissionTitle: 'Postcolonial Literature Reflection',
    status: 'questions_ready',
  }),
  createRow({
    id: 'c',
    studentId: 'STU-1120',
    submissionTitle: 'Victorian Novel Analysis',
    status: 'recorded',
  }),
  createRow({
    id: 'd',
    studentId: 'STU-1121',
    submissionTitle: 'Victorian Poetry Analysis',
    status: 'recorded',
  }),
]

describe('countSubmissionsByStatus', () => {
  it('counts every status and reports the unfiltered total', () => {
    expect(countSubmissionsByStatus(rows)).toEqual({
      all: 4,
      pending: 1,
      questions_ready: 1,
      recorded: 2,
    })
  })

  it('reports zeroes rather than missing keys for an empty list', () => {
    expect(countSubmissionsByStatus([])).toEqual({
      all: 0,
      pending: 0,
      questions_ready: 0,
      recorded: 0,
    })
  })
})

describe('filterSubmissions', () => {
  it('keeps every row when no status is chosen and nothing is searched', () => {
    expect(filterSubmissions(rows, { search: '', status: 'all' })).toHaveLength(4)
  })

  it('keeps only rows in the chosen status', () => {
    const result = filterSubmissions(rows, { search: '', status: 'recorded' })

    expect(result.map((row) => row.id)).toEqual(['c', 'd'])
  })

  it('matches a submission title regardless of case', () => {
    const result = filterSubmissions(rows, { search: 'VICTORIAN', status: 'all' })

    expect(result.map((row) => row.id)).toEqual(['c', 'd'])
  })

  it('matches a student ID as well as a title', () => {
    const result = filterSubmissions(rows, { search: 'stu-1098', status: 'all' })

    expect(result.map((row) => row.id)).toEqual(['b'])
  })

  it('ignores surrounding whitespace in the search term', () => {
    const result = filterSubmissions(rows, { search: '   modernist  ', status: 'all' })

    expect(result.map((row) => row.id)).toEqual(['a'])
  })

  it('applies the search and the status together', () => {
    const result = filterSubmissions(rows, { search: 'victorian', status: 'pending' })

    expect(result).toEqual([])
  })

  it('returns nothing when the search matches no row', () => {
    expect(filterSubmissions(rows, { search: 'chaucer', status: 'all' })).toEqual([])
  })
})

describe('compareSubmissionStatus', () => {
  it('orders statuses by workflow progress rather than alphabetically', () => {
    const ordered = ['recorded', 'pending', 'questions_ready'].sort((a, b) =>
      compareSubmissionStatus(
        a as SubmissionRow['status'],
        b as SubmissionRow['status'],
      ),
    )

    expect(ordered).toEqual(['pending', 'questions_ready', 'recorded'])
  })

  it('treats identical statuses as equal', () => {
    expect(compareSubmissionStatus('recorded', 'recorded')).toBe(0)
  })
})
