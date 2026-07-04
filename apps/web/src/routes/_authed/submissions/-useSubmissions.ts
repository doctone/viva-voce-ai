import { useQuery } from '@tanstack/react-query'
import { getSupabaseBrowserClient } from '../../../utils/supabase-browser'
import type { SubmissionRow } from './-SubmissionsTable'

type VivaRecord = {
  student_id: string
  id: string
  submission_title: string
  created_at: string
}

function formatSubmittedDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

async function fetchSubmissions(): Promise<SubmissionRow[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('submissions')
    .select('id, student_id, submission_title, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error('We could not load submissions.')
  }

  return (data as VivaRecord[]).map((viva) => ({
    id: viva.id,
    studentId: viva.student_id,
    submissionTitle: viva.submission_title,
    dateSubmitted: formatSubmittedDate(viva.created_at),
  }))
}

export function useSubmissions() {
  return useQuery({
    queryFn: fetchSubmissions,
    queryKey: ['submissions'],
  })
}
