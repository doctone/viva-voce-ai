import { useState, type MouseEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortDirection,
  type SortingState,
} from '@tanstack/react-table'
import { cn } from '~/lib/utils'
import {
  eyebrowClassName,
  mutedTextClassName,
  paperPanelClassName,
} from '~/lib/class-names'
import { EmptyState } from '~/components/ui'
import {
  compareSubmissionStatus,
  STATUS_LABEL,
  type SubmissionRow,
  type SubmissionStatus,
} from './-submission'

export type { SubmissionRow, SubmissionStatus } from './-submission'

type SubmissionsTableProps = {
  rows: SubmissionRow[]
  /** Row-count line shown in the panel's top strip, e.g. "5 submissions". */
  summary?: string
}

/**
 * Status reads as a dot plus a word, not a filled chip: on a list where most
 * rows share a state, filled chips turn the table into a wall of colour. The
 * dot carries the state, and only the actionable one is inked in the primary.
 */
const STATUS_DOT_CLASSNAME: Record<SubmissionStatus, string> = {
  pending: 'border border-outline bg-transparent',
  questions_ready: 'bg-primary',
  recorded: 'bg-outline',
}

const STATUS_TEXT_CLASSNAME: Record<SubmissionStatus, string> = {
  pending: 'text-on-surface-variant',
  questions_ready: 'text-on-surface',
  recorded: 'text-on-surface-variant',
}

function StatusChip({ status }: { status: SubmissionStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-[12px] font-bold uppercase leading-none tracking-[0.08em] whitespace-nowrap',
        STATUS_TEXT_CLASSNAME[status],
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-2 shrink-0', STATUS_DOT_CLASSNAME[status])}
      />
      {STATUS_LABEL[status]}
    </span>
  )
}

const columnHelper = createColumnHelper<SubmissionRow>()

/**
 * `students` has no name or reference number yet, so a submission's only
 * identity is a UUID. A full UUID is unreadable in a scannable column, so the
 * first segment is shown and the whole value stays in the title attribute.
 * Anything that is not UUID-shaped is already human-readable and passes through.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function formatStudentReference(studentId: string) {
  return UUID_PATTERN.test(studentId)
    ? studentId.slice(0, 8).toUpperCase()
    : studentId
}

const columns = [
  columnHelper.accessor('submissionTitle', {
    header: 'Submission',
    cell: (info) => {
      const { id: submissionId, studentId } = info.row.original

      return (
        <div className="grid gap-1">
          <Link
            to="/submissions/$submissionId"
            params={{ submissionId }}
            className="text-[15px] font-medium leading-6 text-on-surface underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:color-mix(in_srgb,var(--color-primary)_55%,white)] md:line-clamp-2"
          >
            {info.getValue()}
          </Link>
          <span
            className="font-sans text-[12px] leading-5 text-on-surface-variant [font-variant-numeric:tabular-nums]"
            title={studentId}
          >
            Student {formatStudentReference(studentId)}
          </span>
        </div>
      )
    },
  }),
  columnHelper.accessor('dateSubmitted', {
    header: 'Submitted',
    // Sort on the raw timestamp — the displayed "12 Mar 2026" would sort
    // alphabetically, which puts August before March.
    sortingFn: (a, b) => a.original.submittedAt.localeCompare(b.original.submittedAt),
    cell: (info) => (
      <span className="text-on-surface-variant whitespace-nowrap [font-variant-numeric:tabular-nums]">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    sortingFn: (a, b) => compareSubmissionStatus(a.original.status, b.original.status),
    cell: (info) => <StatusChip status={info.getValue()} />,
  }),
]

const HEADER_WIDTH_CLASSNAME: Record<string, string> = {
  submissionTitle: 'w-auto',
  dateSubmitted: 'w-[18%]',
  status: 'w-[24%]',
}

/**
 * Below `md` the table collapses into stacked cards, so cells are re-ordered to
 * read title-first and the redundant labels are dropped.
 */
const MOBILE_CELL: Record<string, { className: string; showLabel: boolean }> = {
  submissionTitle: { className: 'order-1', showLabel: false },
  status: { className: 'order-2 justify-items-start', showLabel: false },
  dateSubmitted: { className: 'order-3', showLabel: true },
}

const MOBILE_SORT_OPTIONS = [
  { value: 'dateSubmitted:desc', label: 'Newest first' },
  { value: 'dateSubmitted:asc', label: 'Oldest first' },
  { value: 'submissionTitle:asc', label: 'Title A–Z' },
  { value: 'status:asc', label: 'Status' },
]

const DEFAULT_SORTING: SortingState = [{ id: 'dateSubmitted', desc: true }]

const ARIA_SORT: Record<SortDirection, 'ascending' | 'descending'> = {
  asc: 'ascending',
  desc: 'descending',
}

function SortIndicator({ direction }: { direction: SortDirection | false }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'text-[10px] leading-none transition-opacity duration-150 ease-out',
        direction ? 'opacity-100' : 'opacity-0 group-hover:opacity-40',
      )}
    >
      {direction === 'asc' ? '▲' : '▼'}
    </span>
  )
}

export function SubmissionsTable({ rows, summary }: SubmissionsTableProps) {
  const navigate = useNavigate()
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    // A list with no sort order is a state the teacher can't read off the
    // headers, so headers toggle between the two directions only.
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No submissions yet."
        description="Student submissions will appear here once coursework is ready for review."
      />
    )
  }

  const openSubmission = (submissionId: string) => {
    void navigate({ to: '/submissions/$submissionId', params: { submissionId } })
  }

  // The title link is the accessible target for this row; the row click only
  // widens the mouse hit area, so it must not hijack real controls or the end
  // of a text selection.
  const handleRowClick = (
    event: MouseEvent<HTMLTableRowElement>,
    submissionId: string,
  ) => {
    if (event.defaultPrevented) {
      return
    }

    if ((event.target as HTMLElement).closest('a, button, input, select, textarea')) {
      return
    }

    if (window.getSelection()?.toString()) {
      return
    }

    openSubmission(submissionId)
  }

  const activeSort = sorting[0] ?? DEFAULT_SORTING[0]

  return (
    <div className={cn(paperPanelClassName, 'grid')}>
      <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-5 py-3">
        {summary ? (
          <p
            role="status"
            className={cn(mutedTextClassName, 'text-sm leading-6')}
          >
            {summary}
          </p>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-3 md:hidden">
          <label htmlFor="submissions-sort" className={eyebrowClassName}>
            Sort
          </label>
          <select
            id="submissions-sort"
            value={`${activeSort.id}:${activeSort.desc ? 'desc' : 'asc'}`}
            onChange={(event) => {
              const [id, direction] = event.target.value.split(':')
              setSorting([{ id, desc: direction === 'desc' }])
            }}
            className="border border-outline-variant bg-transparent px-2 py-1 text-sm text-on-surface focus:border-primary focus:outline-none"
          >
            {MOBILE_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <table aria-label="Submissions" className="w-full border-collapse">
        <thead className="hidden md:table-header-group">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sortDirection = header.column.getIsSorted()

                return (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={sortDirection ? ARIA_SORT[sortDirection] : 'none'}
                    className={cn(
                      'sticky top-0 z-10 border-b border-outline-variant bg-surface-container-low px-5 py-2.5 text-left align-middle',
                      HEADER_WIDTH_CLASSNAME[header.column.id],
                    )}
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="group inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-on-surface-variant transition-colors duration-150 ease-out hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:color-mix(in_srgb,var(--color-primary)_55%,white)]"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        <SortIndicator direction={sortDirection} />
                      </button>
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const submissionId = row.original.id

            return (
              <tr
                key={row.id}
                className="grid cursor-pointer gap-2 border-b border-outline-variant px-5 py-4 transition-colors duration-150 ease-out last:border-b-0 hover:bg-surface-container-low focus-within:bg-surface-container-low md:table-row md:gap-0 md:px-0 md:py-0"
                onClick={(event) => handleRowClick(event, submissionId)}
              >
                {row.getVisibleCells().map((cell) => {
                  const mobile = MOBILE_CELL[cell.column.id]

                  return (
                    <td
                      key={cell.id}
                      data-label={String(cell.column.columnDef.header)}
                      className={cn(
                        'grid gap-1 text-sm leading-6 text-on-surface md:table-cell md:px-5 md:py-4 md:align-middle',
                        mobile?.className,
                        mobile?.showLabel &&
                          'before:text-[12px] before:font-bold before:uppercase before:leading-none before:tracking-[0.08em] before:text-on-surface-variant before:content-[attr(data-label)] md:before:content-none',
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
