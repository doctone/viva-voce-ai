export type SubmissionStatus = 'pending' | 'questions_ready' | 'recorded'

export type SubmissionRow = {
  id: string
  studentId: string
  submissionTitle: string
  /** Pre-formatted for reading, e.g. "12 Mar 2026". */
  dateSubmitted: string
  /** Raw ISO timestamp, so the table sorts chronologically rather than alphabetically. */
  submittedAt: string
  status: SubmissionStatus
}

export type StatusFilter = 'all' | SubmissionStatus

/**
 * One vocabulary for the three states. The filter control and the row chips
 * read identically so it is obvious which rows a filter is about to keep.
 */
export const STATUS_LABEL: Record<SubmissionStatus, string> = {
  pending: 'Awaiting Questions',
  questions_ready: 'Ready to Record',
  recorded: 'Recorded',
}

/** The order a submission moves through as the teacher works it. */
export const STATUS_WORKFLOW_ORDER: SubmissionStatus[] = [
  'pending',
  'questions_ready',
  'recorded',
]

export const STATUS_FILTER_ORDER: StatusFilter[] = ['all', ...STATUS_WORKFLOW_ORDER]

export const STATUS_FILTER_LABEL: Record<StatusFilter, string> = {
  all: 'All',
  ...STATUS_LABEL,
}

/** Sorts by workflow progress rather than alphabetically. */
export function compareSubmissionStatus(a: SubmissionStatus, b: SubmissionStatus) {
  return STATUS_WORKFLOW_ORDER.indexOf(a) - STATUS_WORKFLOW_ORDER.indexOf(b)
}

export function countSubmissionsByStatus(
  rows: SubmissionRow[],
): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = {
    all: rows.length,
    pending: 0,
    questions_ready: 0,
    recorded: 0,
  }

  for (const row of rows) {
    counts[row.status] += 1
  }

  return counts
}

type SubmissionFilters = {
  search: string
  status: StatusFilter
}

/** Matches a student ID or a submission title, case- and whitespace-insensitively. */
export function filterSubmissions(
  rows: SubmissionRow[],
  { search, status }: SubmissionFilters,
): SubmissionRow[] {
  const term = search.trim().toLowerCase()

  return rows.filter((row) => {
    if (status !== 'all' && row.status !== status) {
      return false
    }

    if (term === '') {
      return true
    }

    return (
      row.studentId.toLowerCase().includes(term) ||
      row.submissionTitle.toLowerCase().includes(term)
    )
  })
}
