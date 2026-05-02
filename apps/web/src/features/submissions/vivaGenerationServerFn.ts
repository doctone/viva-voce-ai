import { createServerFn } from '@tanstack/react-start'
import { generateSubmissionVivaAnalysis } from './generateSubmissionViva'

export const generateSubmissionVivaFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { submissionId: string }) => data)
  .handler(async ({ data }) => {
    return generateSubmissionVivaAnalysis({
      submissionId: data.submissionId,
    })
  })
