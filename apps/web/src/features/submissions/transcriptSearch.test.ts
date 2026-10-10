import { describe, expect, it } from 'vitest'
import { searchTranscript } from './transcriptSearch'

const segments = [
  { sequence: 2, text: 'Italy stayed out in 1914.' },
  { sequence: 0, text: 'The alliances were defensive.' },
  { sequence: 1, text: '  ' },
  { sequence: 3, text: 'So the ALLIANCES were not automatic, and alliances mattered less.' },
]

describe('searchTranscript', () => {
  it('lists every spoken segment in recording order when there is no query', () => {
    const result = searchTranscript(segments, '')

    expect(result.lines.map((line) => line.sequence)).toEqual([0, 2, 3])
    expect(result.lines[0]?.parts).toEqual([
      { text: 'The alliances were defensive.', isMatch: false },
    ])
    expect(result.matchCount).toBe(0)
  })

  it('places each segment at the start of its 15 second chunk', () => {
    const result = searchTranscript(segments, '')

    expect(result.lines.map((line) => line.startSeconds)).toEqual([0, 30, 45])
  })

  it('keeps only matching segments and marks every match regardless of case', () => {
    const result = searchTranscript(segments, '  alliances ')

    expect(result.lines.map((line) => line.sequence)).toEqual([0, 3])
    expect(result.lines[1]?.parts).toEqual([
      { text: 'So the ', isMatch: false },
      { text: 'ALLIANCES', isMatch: true },
      { text: ' were not automatic, and ', isMatch: false },
      { text: 'alliances', isMatch: true },
      { text: ' mattered less.', isMatch: false },
    ])
    expect(result.matchCount).toBe(2)
  })

  it('returns no lines when nothing matches', () => {
    const result = searchTranscript(segments, 'Schlieffen')

    expect(result.lines).toEqual([])
    expect(result.matchCount).toBe(0)
  })
})
