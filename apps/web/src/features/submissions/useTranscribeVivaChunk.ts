import { useServerFn } from '@tanstack/react-start'
import { transcribeVivaChunkFn } from './vivaTranscriptionServerFn'

export function useTranscribeVivaChunk() {
  const transcribeVivaChunk = useServerFn(transcribeVivaChunkFn)

  return async (vivaSessionId: string, sequence: number) => {
    return transcribeVivaChunk({ data: { sequence, vivaSessionId } })
  }
}
