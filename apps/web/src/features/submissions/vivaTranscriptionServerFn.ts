import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '../../utils/supabase-server'
import {
  createOpenAiTranscriber,
  createSupabaseVivaTranscriptionRepository,
  transcribeVivaChunk,
} from './vivaTranscription'

export const transcribeVivaChunkFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { sequence: number; vivaSessionId: string }) => data)
  .handler(async ({ data }) => {
    return transcribeVivaChunk(
      data,
      createSupabaseVivaTranscriptionRepository(getSupabaseServerClient()),
      createOpenAiTranscriber(),
    )
  })
