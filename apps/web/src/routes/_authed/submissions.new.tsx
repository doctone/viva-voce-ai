import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '../../hooks/useMutation'
import { getSupabaseBrowserClient } from '../../utils/supabase-browser'
import { Button } from '../../components/ui/Button'
import { SelectField } from '../../components/ui/SelectField'
import { TextAreaField } from '../../components/ui/TextAreaField'
import { TextField } from '../../components/ui/TextField'
import {
  cn,
  eyebrowClassName,
  headingOneClassName,
  mutedTextClassName,
  paperPanelClassName,
  sectionCardClassName,
} from '../../styles/classes'

export const Route = createFileRoute('/_authed/submissions/new')({
  component: NewVivaSubmissionPage,
})

type StudentRecord = {
  id: string
}

type CreateSubmissionInput = {
  studentId: string
  submissionText: string
  title: string
}

function countWords(value: string) {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return 0
  }

  return trimmedValue.split(/\s+/).length
}

async function fetchStudents() {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('students')
    .select('id')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error('We could not load students.')
  }

  return (data as StudentRecord[] | null) ?? []
}

async function createSubmission({
  studentId,
  submissionText,
  title,
}: CreateSubmissionInput) {
  const supabase = getSupabaseBrowserClient()
  const { error } = await supabase
    .from('submissions')
    .insert({
      student_id: studentId,
      submission_text: submissionText,
      submission_title: title,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error('We could not create the submission. Please try again.')
  }
}

export function NewVivaSubmissionPage() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [studentId, setStudentId] = React.useState('')
  const [title, setTitle] = React.useState('')
  const [submissionText, setSubmissionText] = React.useState('')
  const wordCount = countWords(submissionText)
  const studentsQuery = useQuery({
    queryFn: fetchStudents,
    queryKey: ['students'],
  })
  const createSubmissionMutation = useMutation<CreateSubmissionInput, void>({
    fn: createSubmission,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['submissions'] })
      await router.navigate({ to: '/submissions' })
    },
  })

  return (
    <section className="grid gap-8">
      <div className="grid gap-3">
        <span className={eyebrowClassName}>Submissions</span>
        <h1 className={headingOneClassName}>New submission</h1>
        <p className={cn(mutedTextClassName, 'max-w-[64ch] text-sm leading-6')}>
          Save the submission now. Viva questions will be generated from this
          work in the next step once that service is connected.
        </p>
      </div>

      <form
        className={cn(paperPanelClassName, sectionCardClassName, 'gap-6')}
        onSubmit={(event) => {
          event.preventDefault()

          createSubmissionMutation.mutate({
            studentId,
            submissionText,
            title,
          })
        }}
      >
        <SelectField
          id="studentId"
          name="studentId"
          label="Student"
          required
          value={studentId}
          onChange={(event) => {
            setStudentId(event.target.value)
          }}
        >
          <option value="">
            {studentsQuery.isLoading ? 'Loading students...' : 'Select a student'}
          </option>
          {(studentsQuery.data ?? []).map((student) => {
            return (
              <option key={student.id} value={student.id}>
                {student.id}
              </option>
            )
          })}
        </SelectField>

        <TextField
          id="title"
          name="title"
          label="Title"
          required
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
          }}
        />

        <div className="grid gap-3">
          <TextAreaField
            id="submissionText"
            name="submissionText"
            label="Submission text"
            required
            rows={14}
            value={submissionText}
            onChange={(event) => {
              setSubmissionText(event.target.value)
            }}
            className="min-h-[22rem] resize-y leading-7"
          />

          <p className={cn(mutedTextClassName, 'text-sm leading-6')}>
            {wordCount} words, guidance: around 400.
          </p>
        </div>

        {studentsQuery.error instanceof Error ? (
          <p className="text-sm leading-6 text-error">{studentsQuery.error.message}</p>
        ) : null}

        {createSubmissionMutation.error instanceof Error ? (
          <p className="text-sm leading-6 text-error">
            {createSubmissionMutation.error.message}
          </p>
        ) : null}

        <div>
          <Button
            type="submit"
            disabled={
              studentsQuery.isLoading || createSubmissionMutation.status === 'pending'
            }
          >
            Generate viva questions
          </Button>
        </div>
      </form>
    </section>
  )
}
