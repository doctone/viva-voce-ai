import { useServerFn } from '@tanstack/react-start'
import { generateSubmissionVivaFn } from './vivaGenerationServerFn'

export function useGenerateSubmissionViva() {
  const generateSubmissionViva = useServerFn(generateSubmissionVivaFn)

  return async (submissionId: string) => {
    return generateSubmissionViva({
      data: {
        submissionId,
      },
    })
  }
}
