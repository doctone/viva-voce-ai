import { useQuery } from '@tanstack/react-query'
import { getSupabaseBrowserClient } from '../../../utils/supabase-browser'
import type { SubmissionRow, SubmissionStatus } from './-submission'

type VivaRecord = {
  student_id: string
  id: string
  submission_title: string
  created_at: string
  viva_questions: Array<{ count: number }>
  submission_viva: Array<{ count: number }>
}

function formatSubmittedDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function deriveSubmissionStatus(
  vivaQuestionsCount: number,
  submissionVivaCount: number,
): SubmissionStatus {
  if (submissionVivaCount > 0) {
    return 'recorded'
  }

  if (vivaQuestionsCount > 0) {
    return 'questions_ready'
  }

  return 'pending'
}

async function fetchSubmissions(): Promise<SubmissionRow[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('submissions')
    .select(
      'id, student_id, submission_title, created_at, viva_questions(count), submission_viva(count)',
    )
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error('We could not load submissions.')
  }

  return (data as VivaRecord[]).map((viva) => ({
    id: viva.id,
    studentId: viva.student_id,
    submissionTitle: viva.submission_title,
    dateSubmitted: formatSubmittedDate(viva.created_at),
    submittedAt: viva.created_at,
    status: deriveSubmissionStatus(
      viva.viva_questions?.[0]?.count ?? 0,
      viva.submission_viva?.[0]?.count ?? 0,
    ),
  }))
}

export function useSubmissions() {
  return useQuery({
    queryFn: fetchSubmissions,
    queryKey: ['submissions'],
  })
}
