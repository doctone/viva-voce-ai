import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  cn,
  eyebrowClassName,
  headingOneClassName,
  headingTwoClassName,
  mutedTextClassName,
  paperPanelClassName,
  sectionCardClassName,
} from '../../styles/classes'
import { Button } from '../../components/ui/Button'
import { AddManualQuestionCard, QuestionCard } from './submissions/-QuestionCard'
import { getSupabaseBrowserClient } from '../../utils/supabase-browser'

export const Route = createFileRoute('/_authed/submissions/$submissionId')({
  component: SubmissionDetailPage,
})

type SubmissionRecord = {
  created_at: string
  id: string
  student_id: string
  submission_text: string
  submission_title: string
}

type SubmissionQuestionRecord = {
  category: string
  display_order: number
  id: string
  question_text: string
  submission_id: string
  teacher_note: string
}

type SubmissionQuestion = {
  category: string
  id: string
  isHighlighted?: boolean
  label: string
  questionText: string
  teacherNote: string
}

const fallbackQuestions: SubmissionQuestion[] = [
  {
    id: 'fallback-1',
    category: 'Comprehension',
    label: 'Concept: Trade Governance',
    questionText: 'What does the phrase "formalized system of international trade governance" mean in your own words?',
    teacherNote: 'Listen for secure understanding of the student\'s own opening claim.',
  },
  {
    id: 'fallback-2',
    category: 'Reasoning',
    label: 'Argument: Atlantic Trade',
    questionText: 'Why did you connect mercantile law to the growth of Atlantic trade?',
    teacherNote: 'Listen for cause-and-effect reasoning rather than recall only.',
  },
  {
    id: 'fallback-3',
    category: 'Ownership',
    isHighlighted: true,
    label: 'Critical Analysis',
    questionText: 'Which sentence best shows your own voice, and why did you phrase it that way?',
    teacherNote: 'Listen for reflection on drafting choices and vocabulary decisions.',
  },
]

async function fetchSubmission(submissionId: string) {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('submissions')
    .select('id, student_id, submission_title, submission_text, created_at')
    .eq('id', submissionId)

  if (error) {
    throw new Error('We could not load the submission.')
  }

  const submission = (data as SubmissionRecord[] | null)?.[0]

  if (!submission) {
    throw new Error('Submission not found.')
  }

  return submission
}

async function fetchSubmissionQuestions(
  submissionId: string,
): Promise<SubmissionQuestion[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('submission_questions')
    .select('id, submission_id, category, question_text, teacher_note, display_order')
    .eq('submission_id', submissionId)
    .order('display_order', { ascending: true })

  if (error) {
    throw new Error('We could not load submission questions.')
  }

  const rows = (data as SubmissionQuestionRecord[] | null) ?? []

  if (rows.length === 0) {
    return fallbackQuestions
  }

  return rows.map((question) => ({
    id: question.id,
    category: formatQuestionCategory(question.category),
    isHighlighted: question.category === 'critical_analysis',
    label: formatQuestionCategory(question.category),
    questionText: question.question_text,
    teacherNote: question.teacher_note,
  }))
}

function formatQuestionCategory(category: string) {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatSubmissionDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function splitSubmissionTextIntoParagraphs(value: string) {
  return value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

export function SubmissionDetailPage() {
  const { submissionId } = Route.useParams()
  const submissionQuery = useQuery({
    queryFn: () => fetchSubmission(submissionId),
    queryKey: ['submission', submissionId],
  })
  const questionsQuery = useQuery({
    queryFn: () => fetchSubmissionQuestions(submissionId),
    queryKey: ['submission-questions', submissionId],
  })

  if (submissionQuery.isLoading) {
    return (
      <section className={cn(paperPanelClassName, sectionCardClassName)}>
        <span className={eyebrowClassName}>Submissions</span>
        <h1 className={headingOneClassName}>Loading submission</h1>
      </section>
    )
  }

  if (submissionQuery.error instanceof Error) {
    return (
      <section className={cn(paperPanelClassName, sectionCardClassName)}>
        <span className={eyebrowClassName}>Submissions</span>
        <h1 className={headingOneClassName}>Submission unavailable</h1>
        <p className="text-sm leading-6 text-error">{submissionQuery.error.message}</p>
      </section>
    )
  }

  const submission = submissionQuery.data as SubmissionRecord
  const submissionParagraphs = splitSubmissionTextIntoParagraphs(submission.submission_text)
  const questions = questionsQuery.data ?? fallbackQuestions

  return (
    <section className="grid gap-8">
      <div className="grid gap-3">
        <span className={eyebrowClassName}>Submissions</span>
        <h1 className={headingOneClassName}>{submission.submission_title}</h1>
        <p className={cn(mutedTextClassName, 'text-sm leading-6')}>
          Student {submission.student_id} · Submitted {formatSubmissionDate(submission.created_at)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12 xl:items-start">
        <section className="space-y-8 xl:col-span-7">
          <article className={cn(paperPanelClassName, 'relative overflow-hidden p-8')}>
            <div className="absolute inset-y-0 left-0 w-1 bg-primary-container" />
            <h2 className="mb-6 border-b border-stone-100 pb-4 font-display text-[32px] font-medium leading-[1.3] tracking-[-0.01em] text-primary">
              The Submission
            </h2>
            <div className="max-w-2xl space-y-4 font-serif text-lg leading-relaxed text-on-surface-variant">
              {submissionParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>

          <section className={cn(paperPanelClassName, 'bg-surface-container-low p-8')}>
            <h2 className="mb-4 font-display text-[32px] font-medium leading-[1.3] tracking-[-0.01em] text-primary">
              Oral Examination (Audio)
            </h2>
            <p className={cn(mutedTextClassName, 'mb-6 text-sm leading-6')}>
              Upload the recorded Viva Voce session to generate an automated transcription and analysis.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button type="button" variant="secondary" disabled>
                Upload recording
              </Button>
              <span className={cn(mutedTextClassName, 'text-sm')}>
                Audio upload will be connected in a later step.
              </span>
            </div>
          </section>
        </section>

        <aside className="space-y-4 xl:col-span-5 xl:sticky xl:top-24">
          <div className="mb-4 flex items-center justify-between gap-4 px-2">
            <h2 className={headingTwoClassName}>AI Viva Strategy</h2>
            <button
              type="button"
              className="text-sm font-bold uppercase tracking-[0.08em] text-primary transition-colors hover:text-primary-container"
            >
              Regenerate All
            </button>
          </div>

          {questions.map((question) => (
            <QuestionCard
              key={question.id}
              isHighlighted={question.isHighlighted}
              label={question.label}
              questionText={question.questionText}
            />
          ))}

          <AddManualQuestionCard />
        </aside>
      </div>
    </section>
  )
}
