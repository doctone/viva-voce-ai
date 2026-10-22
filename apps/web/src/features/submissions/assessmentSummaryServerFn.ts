import { createServerFn } from '@tanstack/react-start'
import {
  draftAssessmentSummary,
  type ApprovedEvidence,
} from './assessmentSummary'
import { openAiSummaryDrafter } from './assessmentSummaryOpenAi'
import { getSupabaseServerClient } from '../../utils/supabase-server'

export const draftAssessmentSummaryFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { evidence: ApprovedEvidence[]; instruction?: string }) => data,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { data: auth } = await supabase.auth.getUser()

    if (!auth.user) {
      return { outcome: 'unauthorized' as const }
    }

    return draftAssessmentSummary(data.evidence, openAiSummaryDrafter, {
      instruction: data.instruction,
    })
  })
