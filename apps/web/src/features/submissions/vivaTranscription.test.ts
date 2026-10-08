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

describe('transcribeVivaChunk with diarization', () => {
  const utterances = [
    { providerSpeaker: 'A', startMs: 500, endMs: 2000, text: 'Why?' },
    { providerSpeaker: 'B', startMs: 4000, endMs: 6000, text: 'Because.' },
  ]

  function withUtterances() {
    const saved: unknown[] = []
    return {
      saved,
      repo: createRepository({
        findAskOffsetsMs: async () => [0],
        saveUtterances: async ({ utterances }) => {
          saved.push(...utterances)
        },
      }),
    }
  }

  it('stores text and attributed utterances', async () => {
    const { repo, saved } = withUtterances()

    const result = await transcribeVivaChunk(chunk, repo, async () => 'plain', async () => utterances)

    expect(result).toEqual({ outcome: 'transcribed', text: 'Why? Because.' })
    expect(saved).toHaveLength(2)
    expect(saved[0]).toMatchObject({ speaker: 'teacher' })
  })

  it('keeps plain text when diarization fails', async () => {
    const { repo, saved } = withUtterances()

    const result = await transcribeVivaChunk(chunk, repo, async () => 'plain', async () => {
      throw new Error('boom')
    })

    expect(result).toEqual({ outcome: 'transcribed', text: 'plain' })
    expect(repo.saved).toEqual([{ sequence: 0, text: 'plain' }])
    expect(saved).toEqual([])
  })

  it('keeps the segment when saving utterances fails', async () => {
    const repo = createRepository({
      saveUtterances: async () => {
        throw new Error('db down')
      },
    })

    const result = await transcribeVivaChunk(chunk, repo, async () => 'plain', async () => utterances)

    expect(result.outcome).toBe('transcribed')
    expect(repo.saved).toHaveLength(1)
  })

  it('does not diarize again on re-transcription', async () => {
    const { repo, saved } = withUtterances()
    const diarize = vi.fn(async () => utterances)
    const again = { ...repo, hasSegment: async () => true }

    const result = await transcribeVivaChunk(chunk, again, async () => 'x', diarize)

    expect(result).toEqual({ outcome: 'already_transcribed' })
    expect(diarize).not.toHaveBeenCalled()
    expect(saved).toEqual([])
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
