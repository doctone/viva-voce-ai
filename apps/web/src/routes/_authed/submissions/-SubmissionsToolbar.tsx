import { cn } from '~/lib/utils'
import {
  focusRingClassName,
  segmentedCountClassName,
  segmentedItemClassName,
  segmentedTrackClassName,
} from '~/lib/class-names'
import {
  STATUS_FILTER_LABEL,
  STATUS_FILTER_ORDER,
  type StatusFilter,
} from './-submission'

type SubmissionsToolbarProps = {
  counts: Record<StatusFilter, number>
  onSearchChange: (search: string) => void
  onStatusChange: (status: StatusFilter) => void
  search: string
  status: StatusFilter
}

/**
 * A phone fits four segments only with one-word labels. The full label stays
 * the accessible name, so a screen reader hears the same words as the stage
 * summary and the table.
 */
const SHORT_FILTER_LABEL: Record<StatusFilter, string> = {
  all: 'All',
  pending: 'Awaiting',
  questions_ready: 'Ready',
  recorded: 'Recorded',
}

export function SubmissionsToolbar({
  counts,
  onSearchChange,
  onStatusChange,
  search,
  status,
}: SubmissionsToolbarProps) {
  return (
    <div className="grid gap-3 lg:flex lg:items-center lg:justify-between lg:gap-6">
      <div className="flex h-11 items-center gap-2 rounded-[var(--radius)] border border-outline-variant bg-surface-container-lowest px-3 transition-[border-color] duration-150 ease-out focus-within:border-primary lg:h-10 lg:w-[22rem]">
        <label htmlFor="submissions-search" className="sr-only">
          Search
        </label>
        <svg
          aria-hidden="true"
          className="size-4 shrink-0 text-on-surface-variant"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          id="submissions-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by title or student"
          className="min-w-0 flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none"
        />
        {search === '' ? null : (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className={cn(
              'shrink-0 px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-on-surface-variant transition-colors duration-150 ease-out hover:text-primary',
              focusRingClassName,
            )}
          >
            Clear
          </button>
        )}
      </div>

      <div
        role="group"
        aria-label="Filter submissions by status"
        className={cn(segmentedTrackClassName, 'grid grid-cols-4 lg:inline-flex')}
      >
        {STATUS_FILTER_ORDER.map((filter) => (
          <button
            key={filter}
            type="button"
            aria-label={`${STATUS_FILTER_LABEL[filter]} ${counts[filter]}`}
            aria-pressed={filter === status}
            onClick={() => onStatusChange(filter)}
            className={cn(segmentedItemClassName, 'h-10 px-2 lg:h-9 lg:px-3.5')}
          >
            <span className="lg:hidden">{SHORT_FILTER_LABEL[filter]}</span>
            <span className="hidden lg:inline">{STATUS_FILTER_LABEL[filter]}</span>
            <span className={segmentedCountClassName}>{counts[filter]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
