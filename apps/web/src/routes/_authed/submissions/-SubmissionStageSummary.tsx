import { Fragment } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '~/lib/utils'
import { mutedTextClassName } from '~/lib/class-names'
import {
  STATUS_LABEL,
  STATUS_WORKFLOW_ORDER,
  type StatusFilter,
  type SubmissionStatus,
} from './-submission'

/** What each stage means for the teacher, in the order work moves through. */
const STAGE_HINT: Record<SubmissionStatus, string> = {
  pending: 'Questions are being prepared from the submission.',
  questions_ready: 'Questions are ready. Record the viva next.',
  recorded: 'The viva is recorded and transcribed.',
}

/**
 * How many submissions sit at each stage, read left to right as the workflow.
 * A summary only: filtering lives in the segmented control below it, so there
 * is one way to narrow the list.
 */
export function SubmissionStageSummary({
  counts,
}: {
  counts: Record<StatusFilter, number>
}) {
  return (
    <ol
      aria-label="Submission stages"
      className="m-0 grid list-none grid-cols-3 gap-2 p-0 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-0"
    >
      {STATUS_WORKFLOW_ORDER.map((status, index) => (
        <Fragment key={status}>
          {index > 0 ? (
            <li aria-hidden="true" className="hidden place-items-center px-2 text-outline md:grid">
              <ChevronRight className="size-4" />
            </li>
          ) : null}
          <li
            className={cn(
              'grid content-start gap-1 rounded-[var(--radius)] border border-outline-variant bg-surface-container-lowest p-3 md:gap-1.5 md:px-[18px] md:py-4',
            )}
          >
            <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-2.5">
              <span
                className="font-display text-[28px] font-medium leading-none text-primary md:text-[40px]"
                data-testid="stage-count"
              >
                {counts[status]}
              </span>
              <h3 className="m-0 text-[13px] font-bold leading-tight text-primary md:text-[15px]">
                {STATUS_LABEL[status]}
              </h3>
            </div>
            <p className={cn(mutedTextClassName, 'm-0 hidden text-[13px] leading-5 md:block')}>
              {STAGE_HINT[status]}
            </p>
          </li>
        </Fragment>
      ))}
    </ol>
  )
}
