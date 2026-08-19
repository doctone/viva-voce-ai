import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button, buttonClassName, EmptyState, PageFrame } from '../../../components/ui'
import { SubmissionsTable } from './-SubmissionsTable'
import { SubmissionsToolbar } from './-SubmissionsToolbar'
import { useSubmissions } from './-useSubmissions'
import {
  countSubmissionsByStatus,
  filterSubmissions,
  type StatusFilter,
} from './-submission'
import { cn } from '~/lib/utils'
import {
  eyebrowClassName,
  mutedTextClassName,
  paperPanelClassName,
} from '~/lib/class-names'

const SKELETON_ROW_COUNT = 5

function SubmissionsSkeleton() {
  return (
    <div className={cn(paperPanelClassName, 'grid')}>
      <p role="status" className="sr-only">
        Loading submissions...
      </p>
      <div className="hidden border-b border-outline-variant bg-surface-container px-5 py-4 md:block">
        <div className="h-3 w-40 bg-surface-container-highest" />
      </div>
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="grid animate-pulse gap-3 border-b border-outline-variant px-5 py-5 last:border-b-0 md:grid-cols-[16%_minmax(0,1fr)_18%_22%] md:items-center md:gap-5"
        >
          <div className="h-3 w-24 bg-surface-container-high" />
          <div className="h-3 w-3/4 bg-surface-container-high" />
          <div className="h-3 w-24 bg-surface-container-high" />
          <div className="h-6 w-32 bg-surface-container-high" />
        </div>
      ))}
    </div>
  )
}

function SubmissionsError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className={cn(paperPanelClassName, 'grid justify-items-start gap-3 p-8')}>
      <span className={eyebrowClassName}>Could not load</span>
      <p className="font-display text-lg font-medium leading-[1.3] text-on-surface">
        {message}
      </p>
      <p className={cn(mutedTextClassName, 'max-w-[52ch] text-sm leading-6')}>
        Nothing has been changed. Try again, and if the list still will not load,
        the submissions service may be unavailable.
      </p>
      <Button variant="secondary" onClick={onRetry} className="mt-1">
        Try Again
      </Button>
    </div>
  )
}

export function SubmissionsPage() {
  const submissionsQuery = useSubmissions()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')

  const rows = useMemo(() => submissionsQuery.data ?? [], [submissionsQuery.data])
  const counts = useMemo(() => countSubmissionsByStatus(rows), [rows])
  const visibleRows = useMemo(
    () => filterSubmissions(rows, { search, status }),
    [rows, search, status],
  )

  const isFiltered = status !== 'all' || search.trim() !== ''

  const clearFilters = () => {
    setSearch('')
    setStatus('all')
  }

  return (
    <PageFrame
      eyebrow="Workspace"
      title="Submissions"
      description="Every submission in the workspace, newest first. Open one to read it, review its questions, and record the viva."
      actions={
        <Link to="/submissions/new" className={buttonClassName()}>
          New Submission
        </Link>
      }
    >
      {submissionsQuery.isLoading ? (
        <SubmissionsSkeleton />
      ) : submissionsQuery.error instanceof Error ? (
        <SubmissionsError
          message={submissionsQuery.error.message}
          onRetry={() => {
            void submissionsQuery.refetch()
          }}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No submissions yet."
          description="Student submissions will appear here once coursework is ready for review."
          action={
            <Link
              to="/submissions/new"
              className={buttonClassName({ className: 'mt-1', variant: 'secondary' })}
            >
              Create The First Submission
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5">
          <SubmissionsToolbar
            counts={counts}
            onSearchChange={setSearch}
            onStatusChange={setStatus}
            search={search}
            status={status}
          />

          {visibleRows.length === 0 ? (
            <EmptyState
              title="No submissions match these filters."
              description="Try a different student ID or title, or widen the status filter."
              action={
                <Button variant="secondary" onClick={clearFilters} className="mt-1">
                  Clear Filters
                </Button>
              }
            />
          ) : (
            <SubmissionsTable
              rows={visibleRows}
              summary={
                isFiltered
                  ? `Showing ${visibleRows.length} of ${rows.length} submissions`
                  : `${rows.length} ${rows.length === 1 ? 'submission' : 'submissions'}`
              }
            />
          )}
        </div>
      )}
    </PageFrame>
  )
}
