import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '../../utils/supabase-server'
import {
  addEvidence,
  createSupabaseTranscriptEvidenceRepository,
  reviewEvidence,
  saveSuggestions,
  suggestEvidence,
  type ReviewAction,
} from './transcriptEvidence'
import { fetchAskedQuestionWindows } from './transcriptUtterances'
import { fetchRecordingTranscriptSegmentsWithIds } from './recordingTranscript'

async function requesterAndRepository() {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.auth.getUser()

  return {
    repository: createSupabaseTranscriptEvidenceRepository(supabase),
    requester: { userId: data.user?.id ?? null },
    supabase,
  }
}

export const suggestTranscriptEvidenceFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { submissionVivaId: string; vivaSessionId: string }) => data,
  )
  .handler(async ({ data }) => {
    const { repository, requester, supabase } = await requesterAndRepository()

    if (!requester.userId) {
      return { outcome: 'unauthorized' as const }
    }

    const [windows, segments] = await Promise.all([
      fetchAskedQuestionWindows(supabase, data.vivaSessionId),
      fetchRecordingTranscriptSegmentsWithIds(supabase, data.submissionVivaId),
    ])

    return saveSuggestions(
      suggestEvidence(windows, segments),
      requester,
      repository,
    )
  })

export const addTranscriptEvidenceFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { askedEntryId: string; excerpt: string; segmentId: string }) => data,
  )
  .handler(async ({ data }) => {
    const { repository, requester } = await requesterAndRepository()

    return addEvidence(data, requester, repository)
  })

export const reviewTranscriptEvidenceFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { action: ReviewAction; evidenceId: string }) => data)
  .handler(async ({ data }) => {
    const { repository, requester } = await requesterAndRepository()

    return reviewEvidence(data.evidenceId, data.action, requester, repository)
  })
