import { Link } from '@tanstack/react-router'
import { buttonClassName, EmptyState, PageFrame } from '../../../components/ui'
import { SubmissionsTable, type SubmissionRow, type SubmissionStatus } from './-SubmissionsTable'
import { useSubmissions } from './-useSubmissions'
import { cn } from '~/lib/utils'
import { mutedTextClassName } from '~/lib/class-names'

const STATUS_SUMMARY_LABEL: Record<SubmissionStatus, string> = {
  pending: 'Awaiting Questions',
  questions_ready: 'Set Ready',
  recorded: 'Viva Recorded',
}

const STATUS_SUMMARY_ORDER: SubmissionStatus[] = ['pending', 'questions_ready', 'recorded']

function SubmissionStatusSummary({ rows }: { rows: SubmissionRow[] }) {
  const counts: Record<SubmissionStatus, number> = {
    pending: 0,
    questions_ready: 0,
    recorded: 0,
  }

  for (const row of rows) {
    counts[row.status] += 1
  }

  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      aria-label="Submissions by status"
    >
      {STATUS_SUMMARY_ORDER.map((status) => (
        <div
          key={status}
          className="grid gap-1 border border-outline-variant bg-surface-container-lowest px-5 py-4"
        >
          <span className="font-display text-[28px] font-medium leading-none text-primary">
            {counts[status]}
          </span>
          <span className={cn(mutedTextClassName, 'text-sm')}>
            {STATUS_SUMMARY_LABEL[status]}
          </span>
        </div>
      ))}
    </div>
  )
}

export function SubmissionsPage() {
  const submissionsQuery = useSubmissions()
  const rows = submissionsQuery.data ?? []

  return (
    <PageFrame
      eyebrow="Workspace"
      title="Submissions"
      description="Review recent submissions before opening an individual submission record."
      actions={
        <Link to="/submissions/new" className={buttonClassName()}>
          New Submission
        </Link>
      }
    >
      {submissionsQuery.isLoading ? (
        <p className={cn(mutedTextClassName, 'text-sm leading-6')}>
          Loading submissions...
        </p>
      ) : submissionsQuery.error instanceof Error ? (
        <p className="text-sm leading-6 text-error">{submissionsQuery.error.message}</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No submissions yet."
          description="Student submissions will appear here once coursework is ready for review."
        />
      ) : (
        <div className="grid gap-6">
          <SubmissionStatusSummary rows={rows} />
          <SubmissionsTable rows={rows} />
        </div>
      )}
    </PageFrame>
  )
}
