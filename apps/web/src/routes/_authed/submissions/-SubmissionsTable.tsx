import { Link, useNavigate } from '@tanstack/react-router'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'

export type SubmissionRow = {
  id: string
  studentId: string
  submissionTitle: string
  dateSubmitted: string
}

type SubmissionsTableProps = {
  rows: SubmissionRow[]
}

const columnHelper = createColumnHelper<SubmissionRow>()

const columns = [
  columnHelper.accessor('studentId', {
    header: 'Student ID',
    cell: (info) => (
      <span className="font-semibold uppercase tracking-[0.04em] text-on-surface [font-variant-numeric:tabular-nums]">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('submissionTitle', {
    header: 'Submission Title',
    cell: (info) => {
      const submissionId = info.row.original.id

      return (
        <Link
          to="/submissions/$submissionId"
          params={{ submissionId }}
          className="font-medium text-on-surface underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:color-mix(in_srgb,var(--color-primary)_55%,white)]"
        >
          {info.getValue()}
        </Link>
      )
    },
  }),
  columnHelper.accessor('dateSubmitted', {
    header: 'Date Submitted',
    cell: (info) => (
      <span className="text-on-surface-variant [font-variant-numeric:tabular-nums]">
        {info.getValue()}
      </span>
    ),
  }),
]

export function SubmissionsTable({ rows }: SubmissionsTableProps) {
  const navigate = useNavigate()
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (rows.length === 0) {
    return (
      <div className="grid gap-3 border border-dashed border-outline bg-surface-container-low px-6 py-8 text-left">
        <p className="text-base font-medium text-on-surface">
          No submissions yet.
        </p>
        <p className="max-w-[52ch] text-sm leading-6 text-on-surface-variant">
          Student submissions will appear here once coursework is ready for
          review.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden bg-surface-container-lowest">
      <table aria-label="Submissions" className="w-full border-collapse">
        <thead className="hidden md:table-header-group">
          {table.getHeaderGroups().map((headerGroup) => {
            return (
              <tr key={headerGroup.id} className="bg-surface-container">
                {headerGroup.headers.map((header) => {
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className="px-5 py-4 text-left text-[12px] font-bold uppercase tracking-[0.08em] text-on-surface-variant first:w-[22%] last:w-[22%]"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  )
                })}
              </tr>
            )
          })}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const submissionId = row.original.id

            return (
              <tr
                key={row.id}
                className="grid cursor-pointer gap-3 px-5 py-4 transition-colors duration-150 ease-out hover:bg-surface-container-low focus-within:bg-surface-container-low md:table-row md:px-0 md:py-0"
                tabIndex={0}
                role="link"
                onClick={() => {
                  void navigate({
                    to: '/submissions/$submissionId',
                    params: { submissionId },
                  })
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') {
                    return
                  }

                  event.preventDefault()
                  void navigate({
                    to: '/submissions/$submissionId',
                    params: { submissionId },
                  })
                }}
              >
                {row.getVisibleCells().map((cell) => {
                  return (
                    <td
                      key={cell.id}
                      data-label={String(cell.column.columnDef.header)}
                      className="grid gap-1 text-sm leading-6 text-on-surface before:text-[12px] before:font-bold before:uppercase before:tracking-[0.08em] before:text-on-surface-variant before:content-[attr(data-label)] md:table-cell md:px-5 md:py-4 md:align-middle md:before:content-none"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  )}
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
