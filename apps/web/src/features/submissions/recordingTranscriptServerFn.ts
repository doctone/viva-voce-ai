import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '../../utils/supabase-server'
import {
  createSupabaseRecordingTranscriptionRepository,
  createTimedTranscriber,
  enqueueRecordingTranscription,
  processRecordingTranscription,
} from './recordingTranscript'

async function requesterAndRepository() {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase.auth.getUser()

  return {
    repository: createSupabaseRecordingTranscriptionRepository(supabase),
    requester: { userId: data.user?.id ?? null },
  }
}

export const enqueueRecordingTranscriptionFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { submissionVivaId: string }) => data)
  .handler(async ({ data }) => {
    const { repository, requester } = await requesterAndRepository()

    return enqueueRecordingTranscription(data.submissionVivaId, requester, repository)
  })

export const processRecordingTranscriptionFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { submissionVivaId: string }) => data)
  .handler(async ({ data }) => {
    const { repository, requester } = await requesterAndRepository()

    return processRecordingTranscription(
      data.submissionVivaId,
      requester,
      repository,
      createTimedTranscriber(),
    )
  })
