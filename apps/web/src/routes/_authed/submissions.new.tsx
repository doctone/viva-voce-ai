import * as React from 'react'
import { revalidateLogic, useForm } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { createFileRoute } from '@tanstack/react-router'
import {
  FormSelectField,
  FormTextAreaField,
  FormTextField,
} from '../../components/ui/TanStackFormField'
import { useMutation } from '../../hooks/useMutation'
import { getSupabaseBrowserClient } from '../../utils/supabase-browser'
import { Button } from '../../components/ui/Button'
import { cn } from '~/lib/utils'
import {
  eyebrowClassName,
  headingOneClassName,
  mutedTextClassName,
  paperPanelClassName,
  sectionCardClassName,
} from '~/lib/class-names'

export const Route = createFileRoute('/_authed/submissions/new')({
  component: NewSubmissionPage,
})

type StudentRecord = {
  id: string
}

type CreateSubmissionInput = {
  studentId: string
  submissionText: string
  title: string
}

type CreateSubmissionResult = {
  submissionId: string
}

function validateRequiredField(value: string, message: string) {
  return value.trim().length === 0 ? message : undefined
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
}: CreateSubmissionInput): Promise<CreateSubmissionResult> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
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

  const submission = data as { id: string } | null

  if (!submission?.id) {
    throw new Error('We could not create the submission. Please try again.')
  }

  return {
    submissionId: submission.id,
  }
}

export function NewSubmissionPage() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const studentsQuery = useQuery({
    queryFn: fetchStudents,
    queryKey: ['students'],
  })
  const createSubmissionMutation = useMutation<
    CreateSubmissionInput,
    CreateSubmissionResult
  >({
    fn: createSubmission,
    onSuccess: async ({ data }) => {
      await queryClient.invalidateQueries({ queryKey: ['submissions'] })
      await router.navigate({
        params: {
          submissionId: data.submissionId,
        },
        to: '/submissions/$submissionId',
      })
    },
  })
  const form = useForm({
    defaultValues: {
      studentId: '',
      submissionText: '',
      title: '',
    },
    validationLogic: revalidateLogic({
      mode: 'submit',
      modeAfterSubmission: 'change',
    }),
    onSubmit: async ({ value }) => {
      await createSubmissionMutation.mutate(value)
    },
  })

  return (
    <section className="grid gap-8">
      <div className="grid gap-3">
        <span className={eyebrowClassName}>Submissions</span>
        <h1 className={headingOneClassName}>New submission</h1>
        <p className={cn(mutedTextClassName, 'max-w-[64ch] text-sm leading-6')}>
          Save the submission and generate viva questions in one step.
        </p>
      </div>

      <form
        className={cn(paperPanelClassName, sectionCardClassName, 'gap-6')}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()

          void form.handleSubmit()
        }}
      >
        <form.Field
          name="studentId"
          validators={{
            onDynamic: ({ value }) => validateRequiredField(value, 'Select a student.'),
          }}
          children={(field) => (
            <FormSelectField field={field} id="studentId" label="Student">
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
            </FormSelectField>
          )}
        />

        <form.Field
          name="title"
          validators={{
            onDynamic: ({ value }) => validateRequiredField(value, 'Enter a title.'),
          }}
          children={(field) => (
            <FormTextField field={field} id="title" label="Title" />
          )}
        />

        <div className="grid gap-3">
          <form.Field
            name="submissionText"
            validators={{
              onDynamic: ({ value }) =>
                validateRequiredField(value, 'Enter the submission text.'),
            }}
            children={(field) => (
              <FormTextAreaField
                field={field}
                id="submissionText"
                label="Submission text"
                rows={14}
                className="min-h-[22rem] resize-y leading-7"
              />
            )}
          />

          <form.Subscribe
            selector={(state) => countWords(state.values.submissionText)}
            children={(wordCount) => (
              <p className={cn(mutedTextClassName, 'text-sm leading-6')}>
                {wordCount} words, guidance: around 400.
              </p>
            )}
          />
        </div>

        {studentsQuery.error instanceof Error ? (
          <p className="text-sm leading-6 text-error">{studentsQuery.error.message}</p>
        ) : null}

        {createSubmissionMutation.error instanceof Error ? (
          <p className="text-sm leading-6 text-error">
            {createSubmissionMutation.error.message}
          </p>
        ) : null}

        <form.Subscribe
          selector={(state) => state.isSubmitting}
          children={(isSubmitting) => (
            <div className="grid gap-3">
              <Button
                type="submit"
                disabled={studentsQuery.isLoading || isSubmitting}
                isLoading={isSubmitting}
              >
                Generate viva questions
              </Button>
              {isSubmitting ? (
                <p className={cn(mutedTextClassName, 'text-sm leading-6')}>
                  Saving the submission.
                </p>
              ) : null}
            </div>
          )}
        />
      </form>
    </section>
  )
}
