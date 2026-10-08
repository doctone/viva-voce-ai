import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { attributeSpeakers, CHUNK_DURATION_MS } from './speakerAttribution'

// A two-voice viva split into 15s chunks. Provider ids flip between chunks, as
// real diarization output does.
const chunks = [
  { index: 0, utterances: [
    { providerSpeaker: 'A', startMs: 1000, endMs: 3000, text: 'Why this method?' },
    { providerSpeaker: 'B', startMs: 5000, endMs: 9000, text: 'Because it was fastest.' },
  ] },
  { index: 1, utterances: [
    { providerSpeaker: 'B', startMs: 500, endMs: 2500, text: 'And the limits?' },
    { providerSpeaker: 'A', startMs: 4000, endMs: 8000, text: 'Mainly sample size.' },
  ] },
]
const asks = [500, CHUNK_DURATION_MS + 100]

describe('attributeSpeakers', () => {
  it('labels teacher and student consistently across chunks', () => {
    const all = chunks.flatMap((c) =>
      attributeSpeakers(c.utterances, c.index * CHUNK_DURATION_MS, asks),
    )

    expect(all.map((u) => u.speaker)).toEqual(['teacher', 'student', 'teacher', 'student'])
    expect(all.every((u) => u.speakerSource === 'model')).toBe(true)
  })

  it('returns time-ordered utterances offset onto the recording timeline', () => {
    const [first, second] = attributeSpeakers(
      [...chunks[1].utterances].reverse(),
      CHUNK_DURATION_MS,
      asks,
    )

    expect(first.startMs).toBe(CHUNK_DURATION_MS + 500)
    expect(second.startMs).toBe(CHUNK_DURATION_MS + 4000)
    expect(first.confidence).toBeGreaterThan(0)
  })

  it('stores unknown, never student, when there is no anchor', () => {
    const result = attributeSpeakers(chunks[0].utterances, 0, [])

    expect(result.map((u) => u.speaker)).toEqual(['unknown', 'unknown'])
  })

  it('stores unknown for the other voices when a chunk has more than two speakers', () => {
    const result = attributeSpeakers(
      [
        ...chunks[0].utterances,
        { providerSpeaker: 'C', startMs: 11000, endMs: 12000, text: 'Hmm.' },
      ],
      0,
      asks,
    )

    expect(result.map((u) => u.speaker)).toEqual(['teacher', 'unknown', 'unknown'])
  })
})

describe('viva_transcript_utterances migration', () => {
  const sql = readFileSync(
    resolve(__dirname, '../../../../../packages/database/supabase/migrations/20261008120000_create_viva_transcript_utterances.sql'),
    'utf8',
  )

  it('enables row level security with policies', () => {
    expect(sql).toContain('enable row level security')
    expect(sql).toMatch(/create policy[^;]+for select/)
    expect(sql).toMatch(/create policy[^;]+for insert/)
  })

  it('constrains speaker values and makes re-transcription idempotent', () => {
    expect(sql).toContain("speaker in ('teacher', 'student', 'unknown')")
    expect(sql).toContain("speaker_source in ('model', 'teacher')")
    expect(sql).toMatch(/create unique index[^;]+\(viva_session_id, sequence, position\)/)
  })
})
