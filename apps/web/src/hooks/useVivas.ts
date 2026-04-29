import * as React from 'react'
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

export function useVivas() {
  const [rows, setRows] = React.useState<VivaSubmissionRow[]>([])

  React.useEffect(() => {
    let cancelled = false

    async function loadVivas() {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('vivas')
        .select('student_id, submission_title, created_at')
        .order('created_at', { ascending: false })

      if (cancelled || error || !data) {
        return
      }

      const nextRows = (data as VivaRecord[]).map((viva) => ({
        studentId: viva.student_id,
        submissionTitle: viva.submission_title,
        dateSubmitted: formatSubmittedDate(viva.created_at),
      }))

      setRows(nextRows)
    }

    void loadVivas()

    return () => {
      cancelled = true
    }
  }, [])

  return rows
}
