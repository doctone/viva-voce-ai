import { cn, eyebrowClassName, mutedTextClassName, paperPanelClassName } from '../../../styles/classes'

type QuestionCardProps = {
  isHighlighted?: boolean
  label: string
  questionText: string
  teacherNote?: string
}

export function QuestionCard({
  isHighlighted = false,
  label,
  questionText,
  teacherNote,
}: QuestionCardProps) {
  return (
    <article
      className={cn(
        paperPanelClassName,
        'group grid gap-3 bg-surface-container-lowest p-5 transition-colors hover:bg-surface-container-low',
        isHighlighted ? 'border-l-4 border-l-tertiary-container' : '',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]',
            isHighlighted
              ? 'bg-tertiary-container text-on-tertiary'
              : 'bg-surface-container text-on-surface-variant',
          )}
        >
          {label}
        </span>
        <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            aria-label={`Edit question: ${questionText}`}
            className="text-sm text-on-surface-variant transition-colors hover:text-primary"
          >
            Edit
          </button>
          <button
            type="button"
            aria-label={`Star question: ${questionText}`}
            className="text-sm text-on-surface-variant transition-colors hover:text-primary"
          >
            Star
          </button>
        </div>
      </div>
      <p className="font-sans text-base leading-7 font-medium text-primary">
        {questionText}
      </p>
      {teacherNote ? (
        <p className={cn(mutedTextClassName, 'text-sm leading-6')}>
          {teacherNote}
        </p>
      ) : null}
    </article>
  )
}

export function AddManualQuestionCard() {
  return (
    <div className="group flex items-center justify-center border border-dashed border-outline-variant bg-transparent px-5 py-6 transition-colors hover:border-primary">
      <button
        type="button"
        className={cn(mutedTextClassName, 'text-sm font-bold uppercase tracking-[0.08em] group-hover:text-primary')}
      >
        Add Manual Question
      </button>
    </div>
  )
}
