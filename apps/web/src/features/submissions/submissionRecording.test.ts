import { describe, expect, it } from 'vitest'
import { selectSupersededRecordings } from './submissionRecording'

const first = { audioPath: 'submission/first.webm', id: 'a' }
const second = { audioPath: 'submission/second.webm', id: 'b' }
const third = { audioPath: 'submission/third.webm', id: 'c' }

describe('selectSupersededRecordings', () => {
  it('supersedes every recording except the one just saved', () => {
    expect(selectSupersededRecordings([first, second, third], 'c')).toEqual([
      first,
      second,
    ])
  })

  it('supersedes nothing when the saved recording is the only one', () => {
    expect(selectSupersededRecordings([third], 'c')).toEqual([])
  })

  it('never supersedes everything when the keeper is missing', () => {
    // A keeper that is not in the list means the read raced the write. Deleting
    // the rest here would leave the submission with no recording at all.
    expect(selectSupersededRecordings([first, second], 'missing')).toEqual([
      first,
      second,
    ])
  })
})
