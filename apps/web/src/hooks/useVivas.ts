import { useQuery } from '@tanstack/react-query'
import type { VivaSubmissionRow } from '../components/vivas/VivasTable'
import { getSupabaseBrowserClient } from '../utils/supabase-browser'

type VivaRecord = {
  student_id: string
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

async function fetchVivas(): Promise<VivaSubmissionRow[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('submissions')
    .select('student_id, submission_title, created_at')
    .order('created_at', { ascending: false })

  if (error || !data) {
    return []
  }

  return (data as VivaRecord[]).map((viva) => ({
    studentId: viva.student_id,
    submissionTitle: viva.submission_title,
    dateSubmitted: formatSubmittedDate(viva.created_at),
  }))
}

export function useVivas() {
  const { data = [] } = useQuery({
    queryFn: fetchVivas,
    queryKey: ['submissions'],
  })

  return data
}
