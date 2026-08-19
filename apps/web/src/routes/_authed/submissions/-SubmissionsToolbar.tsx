import { cn } from '~/lib/utils'
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

const filterBaseClassName =
  'inline-flex h-11 items-center gap-2 border px-4 text-[12px] font-bold uppercase tracking-[0.08em] whitespace-nowrap transition-[background-color,border-color,color] duration-150 ease-out focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:color-mix(in_srgb,var(--color-primary)_55%,white)]'

export function SubmissionsToolbar({
  counts,
  onSearchChange,
  onStatusChange,
  search,
  status,
}: SubmissionsToolbarProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_auto] lg:items-center lg:justify-between lg:gap-6">
      <div className="flex h-9 items-center gap-2 border-b border-outline px-1 transition-[border-color,background-color] duration-150 ease-out focus-within:border-primary focus-within:bg-surface-container-lowest">
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
          placeholder="Search submissions"
          className="min-w-0 flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none"
        />
        {search === '' ? null : (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="shrink-0 px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-on-surface-variant transition-colors duration-150 ease-out hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:color-mix(in_srgb,var(--color-primary)_55%,white)]"
          >
            Clear
          </button>
        )}
      </div>

      <div
        role="group"
        aria-label="Filter submissions by status"
        className="flex flex-wrap items-center gap-y-2 lg:justify-self-end"
      >
        {STATUS_FILTER_ORDER.map((filter) => {
          const isActive = filter === status

          return (
            <button
              key={filter}
              type="button"
              aria-pressed={isActive}
              onClick={() => onStatusChange(filter)}
              className={cn(
                filterBaseClassName,
                '-ml-px first:ml-0',
                isActive
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-outline-variant bg-transparent text-on-surface-variant hover:border-outline hover:bg-surface-container-low hover:text-on-surface',
              )}
            >
              {STATUS_FILTER_LABEL[filter]}
              <span
                className={cn(
                  'font-sans text-[11px] font-bold [font-variant-numeric:tabular-nums]',
                  isActive ? 'text-on-primary/70' : 'text-on-surface-variant/70',
                )}
              >
                {counts[filter]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
