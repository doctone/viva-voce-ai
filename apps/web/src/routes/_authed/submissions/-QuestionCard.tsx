import * as React from 'react'
import { Button, SelectField, TextAreaField } from '../../../components/ui'
import { cn } from '~/lib/utils'
import { eyebrowClassName, mutedTextClassName, paperPanelClassName } from '~/lib/class-names'

type QuestionCardProps = {
  id: string
  isHighlighted?: boolean
  isInSet?: boolean
  label: string
  onSave: (questionText: string) => Promise<void>
  onToggleInSet?: (included: boolean) => Promise<void>
  questionText: string
  teacherNote?: string
}

export function QuestionCard({
  id,
  isHighlighted = false,
  isInSet = false,
  label,
  onSave,
  onToggleInSet,
  questionText,
  teacherNote,
}: QuestionCardProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [draftText, setDraftText] = React.useState(questionText)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveErrorMessage, setSaveErrorMessage] = React.useState<string | null>(null)
  const [isTogglingSet, setIsTogglingSet] = React.useState(false)
  const [toggleErrorMessage, setToggleErrorMessage] = React.useState<string | null>(null)

  // A background refetch can change the saved question text. While the teacher
  // is not editing, keep the draft in step so re-opening the editor never shows
  // stale text that would overwrite the newer value on save.
  React.useEffect(() => {
    if (!isEditing) {
      setDraftText(questionText)
    }
  }, [isEditing, questionText])

  async function handleToggleInSet(nextIncluded: boolean) {
    if (!onToggleInSet) {
      return
    }

    setIsTogglingSet(true)
    setToggleErrorMessage(null)

    try {
      await onToggleInSet(nextIncluded)
    } catch (error) {
      setToggleErrorMessage(
        error instanceof Error
          ? error.message
          : 'We could not update the Viva Question Set.',
      )
    } finally {
      setIsTogglingSet(false)
    }
  }

  if (isEditing) {
    return (
      <article
        className={cn(
          paperPanelClassName,
          'grid gap-3 bg-surface-container-lowest p-5',
        )}
      >
        <span
          className={cn(
            'w-fit px-2 py-1 text-[12px] font-bold uppercase tracking-[0.08em]',
            isHighlighted
              ? 'bg-tertiary-container text-on-tertiary'
              : 'bg-surface-container text-on-surface-variant',
          )}
        >
          {label}
        </span>
        <TextAreaField
          id={`question-edit-${id}`}
          aria-label={`Edit question text for ${label}`}
          label="Question text"
          value={draftText}
          onChange={(event) => setDraftText(event.target.value)}
          rows={3}
        />
        {saveErrorMessage ? (
          <p className="text-sm text-error">{saveErrorMessage}</p>
        ) : null}
        <div className="flex gap-2">
          <Button
            type="button"
            isLoading={isSaving}
            onClick={async () => {
              setIsSaving(true)
              setSaveErrorMessage(null)

              try {
                await onSave(draftText)
                setIsEditing(false)
              } catch (error) {
                setSaveErrorMessage(
                  error instanceof Error
                    ? error.message
                    : 'We could not save the question.',
                )
              } finally {
                setIsSaving(false)
              }
            }}
          >
            Save
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isSaving}
            onClick={() => {
              setDraftText(questionText)
              setSaveErrorMessage(null)
              setIsEditing(false)
            }}
          >
            Cancel
          </Button>
        </div>
      </article>
    )
  }

  return (
    <article
      className={cn(
        paperPanelClassName,
        'group grid gap-3 bg-surface-container-lowest p-5 transition-colors hover:bg-surface-container-low',
        isHighlighted ? 'border-tertiary-container' : '',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'px-2 py-1 text-[12px] font-bold uppercase tracking-[0.08em]',
              isHighlighted
                ? 'bg-tertiary-container text-on-tertiary'
                : 'bg-surface-container text-on-surface-variant',
            )}
          >
            {label}
          </span>
          {isHighlighted ? (
            <span className="rounded-[var(--radius)] border border-tertiary-container px-2 py-1 text-[12px] font-bold uppercase tracking-[0.08em] text-tertiary">
              Recommended
            </span>
          ) : null}
        </div>
        {/* Revealed on focus as well as hover, and always visible on touch
            widths where there is no hover at all. */}
        <div className="flex gap-2 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
          <button
            type="button"
            aria-label={`Edit question: ${questionText}`}
            className="text-sm text-on-surface-variant transition-colors hover:text-primary"
            onClick={() => {
              setDraftText(questionText)
              setIsEditing(true)
            }}
          >
            Edit
          </button>
        </div>
      </div>
      <p className="font-sans text-base leading-7 font-medium text-primary">
        {questionText}
      </p>
      {teacherNote ? (
        <p className={cn(mutedTextClassName, 'text-sm leading-6')}>
          <span className="font-bold text-on-surface">
            Teacher note (private):
          </span>{' '}
          {teacherNote}
        </p>
      ) : null}
      {onToggleInSet ? (
        <div className="grid gap-1">
          <label className="flex min-h-11 w-fit items-center gap-3 text-sm text-on-surface-variant">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={isInSet}
              disabled={isTogglingSet}
              onChange={(event) => {
                void handleToggleInSet(event.target.checked)
              }}
            />
            {isInSet ? 'In Viva Question Set' : 'Add to Viva Question Set'}
          </label>
          {toggleErrorMessage ? (
            <p className="text-sm text-error">{toggleErrorMessage}</p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

const MANUAL_QUESTION_CATEGORIES = [
  { label: 'Comprehension and accuracy', value: 'comprehension_and_accuracy' },
  { label: 'Argumentation and reasoning', value: 'argumentation_and_reasoning' },
  { label: 'Authenticity and ownership', value: 'authenticity_and_ownership' },
] as const

export type ManualQuestionInput = {
  category: string
  questionText: string
  teacherNote: string
}

type AddManualQuestionCardProps = {
  onAdd: (input: ManualQuestionInput) => Promise<void>
}

export function AddManualQuestionCard({ onAdd }: AddManualQuestionCardProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [category, setCategory] = React.useState<string>(
    MANUAL_QUESTION_CATEGORIES[0].value,
  )
  const [questionText, setQuestionText] = React.useState('')
  const [teacherNote, setTeacherNote] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  function resetForm() {
    setCategory(MANUAL_QUESTION_CATEGORIES[0].value)
    setQuestionText('')
    setTeacherNote('')
    setErrorMessage(null)
  }

  if (!isOpen) {
    return (
      <div className="group flex items-center justify-center rounded-[var(--radius)] border border-dashed border-outline-variant bg-transparent px-5 py-6 transition-colors hover:border-primary">
        <button
          type="button"
          className={cn(mutedTextClassName, 'text-sm font-bold uppercase tracking-[0.08em] group-hover:text-primary')}
          onClick={() => setIsOpen(true)}
        >
          Add Manual Question
        </button>
      </div>
    )
  }

  return (
    <form
      className={cn(paperPanelClassName, 'grid gap-4 bg-surface-container-lowest p-5')}
      onSubmit={async (event) => {
        event.preventDefault()

        if (questionText.trim().length === 0) {
          setErrorMessage('Question text is required.')
          return
        }

        setIsSaving(true)
        setErrorMessage(null)

        try {
          await onAdd({ category, questionText, teacherNote })
          resetForm()
          setIsOpen(false)
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'We could not add the question.',
          )
        } finally {
          setIsSaving(false)
        }
      }}
    >
      <span className={eyebrowClassName}>New manual question</span>
      <SelectField
        id="manual-question-category"
        label="Category"
        value={category}
        onChange={(event) => setCategory(event.target.value)}
      >
        {MANUAL_QUESTION_CATEGORIES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
      <TextAreaField
        id="manual-question-text"
        label="Question text"
        value={questionText}
        onChange={(event) => setQuestionText(event.target.value)}
        rows={3}
      />
      <TextAreaField
        id="manual-question-teacher-note"
        label="Teacher note (optional)"
        value={teacherNote}
        onChange={(event) => setTeacherNote(event.target.value)}
        rows={2}
      />
      {errorMessage ? <p className="text-sm text-error">{errorMessage}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" isLoading={isSaving}>
          Save question
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isSaving}
          onClick={() => {
            resetForm()
            setIsOpen(false)
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
