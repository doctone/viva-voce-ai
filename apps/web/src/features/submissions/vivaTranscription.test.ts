import { describe, expect, it, vi } from 'vitest'
import {
  assembleTranscript,
  buildChunkFileName,
  transcribeVivaChunk,
  type VivaTranscriptionRepository,
} from './vivaTranscription'

function createRepository(
  overrides: Partial<VivaTranscriptionRepository> = {},
): VivaTranscriptionRepository & { saved: Array<{ sequence: number; text: string }> } {
  const saved: Array<{ sequence: number; text: string }> = []

  return {
    saved,
    downloadChunk: async () => new Blob(['audio']),
    findChunk: async () => ({ mimeType: 'audio/webm', storagePath: 'session/00000.webm' }),
    hasSegment: async () => false,
    saveSegment: async ({ sequence, text }) => {
      saved.push({ sequence, text })
    },
    ...overrides,
  }
}

const chunk = { sequence: 0, vivaSessionId: '70420000-0000-0000-0000-000000000000' }

describe('transcribeVivaChunk', () => {
  it('saves the spoken text for a chunk', async () => {
    const repository = createRepository()

    const result = await transcribeVivaChunk(chunk, repository, async () => '  Tell me about your conclusion.  ')

    expect(result).toEqual({
      outcome: 'transcribed',
      text: 'Tell me about your conclusion.',
    })
    expect(repository.saved).toEqual([
      { sequence: 0, text: 'Tell me about your conclusion.' },
    ])
  })

  it('does not transcribe a chunk twice when an upload is retried', async () => {
    const transcribeAudio = vi.fn(async () => 'text')
    const repository = createRepository({ hasSegment: async () => true })

    const result = await transcribeVivaChunk(chunk, repository, transcribeAudio)

    expect(result).toEqual({ outcome: 'already_transcribed' })
    expect(transcribeAudio).not.toHaveBeenCalled()
    expect(repository.saved).toEqual([])
  })

  it('stores nothing for a silent chunk', async () => {
    const repository = createRepository()

    const result = await transcribeVivaChunk(chunk, repository, async () => '   ')

    expect(result).toEqual({ outcome: 'silent' })
    expect(repository.saved).toEqual([])
  })

  it('reports a missing chunk instead of throwing into the live recording', async () => {
    const repository = createRepository({ findChunk: async () => null })

    const result = await transcribeVivaChunk(chunk, repository, async () => 'text')

    expect(result).toEqual({ outcome: 'chunk_unavailable' })
  })

  it('turns a transcription failure into a value so recording continues', async () => {
    const repository = createRepository()

    const result = await transcribeVivaChunk(chunk, repository, async () => {
      throw new Error('Transcription failed with status 429.')
    })

    expect(result).toEqual({
      errorMessage: 'Transcription failed with status 429.',
      outcome: 'failed',
    })
    expect(repository.saved).toEqual([])
  })
})

describe('assembleTranscript', () => {
  it('reads in spoken order even when segments arrive out of order', () => {
    const transcript = assembleTranscript([
      { sequence: 2, text: 'because the evidence was weaker.' },
      { sequence: 0, text: 'I changed the conclusion' },
      { sequence: 1, text: 'in the final draft' },
    ])

    expect(transcript).toBe(
      'I changed the conclusion in the final draft because the evidence was weaker.',
    )
  })

  it('leaves no double spaces where a chunk was silent', () => {
    expect(
      assembleTranscript([
        { sequence: 0, text: 'One side of the argument.' },
        { sequence: 1, text: '   ' },
        { sequence: 2, text: 'And the other.' },
      ]),
    ).toBe('One side of the argument. And the other.')
  })
})

describe('buildChunkFileName', () => {
  it('names the upload so the service picks the right decoder', () => {
    expect(buildChunkFileName(chunk, 'audio/webm;codecs=opus')).toBe(
      '70420000-0000-0000-0000-000000000000-00000.webm',
    )
    expect(buildChunkFileName({ ...chunk, sequence: 12 }, 'audio/mp4')).toBe(
      '70420000-0000-0000-0000-000000000000-00012.m4a',
    )
  })
})
