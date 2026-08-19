import { describe, expect, it } from 'vitest'
import {
  applyLiveTranscriptionEvent,
  selectVisibleTranscript,
  buildTranscriptionSessionUpdate,
  encodePcm16,
  INITIAL_LIVE_TRANSCRIPTION_STATE,
  LIVE_AUDIO_SAMPLE_RATE,
  renderLiveTranscript,
} from './liveTranscription'

function applyAll(events: Parameters<typeof applyLiveTranscriptionEvent>[1][]) {
  return events.reduce(
    applyLiveTranscriptionEvent,
    INITIAL_LIVE_TRANSCRIPTION_STATE,
  )
}

const delta = (text: string) => ({
  delta: text,
  type: 'conversation.item.input_audio_transcription.delta' as const,
})

const completed = (text: string) => ({
  transcript: text,
  type: 'conversation.item.input_audio_transcription.completed' as const,
})

describe('applyLiveTranscriptionEvent', () => {
  it('shows a sentence building as it is spoken', () => {
    const state = applyAll([delta('I changed '), delta('the conclusion')])

    expect(renderLiveTranscript(state)).toBe('I changed the conclusion')
  })

  it('replaces the in-progress guess with the final wording rather than repeating it', () => {
    const state = applyAll([
      delta('I changed the conclu'),
      completed('I changed the conclusion.'),
    ])

    expect(renderLiveTranscript(state)).toBe('I changed the conclusion.')
  })

  it('keeps earlier sentences as later ones are spoken', () => {
    const state = applyAll([
      completed('I changed the conclusion.'),
      delta('Because the evidence'),
    ])

    expect(renderLiveTranscript(state)).toBe(
      'I changed the conclusion. Because the evidence',
    )
  })

  it('drops the guess when a turn completes with nothing recognised', () => {
    const state = applyAll([delta('mmm'), completed('   ')])

    expect(renderLiveTranscript(state)).toBe('')
  })

  it('ignores the other events the socket sends', () => {
    const state = applyAll([
      completed('Kept.'),
      { type: 'input_audio_buffer.speech_started' },
      { type: 'session.updated' },
    ])

    expect(renderLiveTranscript(state)).toBe('Kept.')
  })
})

describe('encodePcm16', () => {
  it('maps silence to zero', () => {
    expect(Array.from(encodePcm16(new Float32Array([0, 0])))).toEqual([0, 0])
  })

  it('maps the extremes to the ends of the range', () => {
    const encoded = encodePcm16(new Float32Array([1, -1]))

    expect(encoded[0]).toBe(32767)
    expect(encoded[1]).toBe(-32768)
  })

  it('clamps beyond the range instead of wrapping a loud passage into noise', () => {
    const encoded = encodePcm16(new Float32Array([1.8, -2.4]))

    expect(encoded[0]).toBe(32767)
    expect(encoded[1]).toBe(-32768)
  })
})

describe('buildTranscriptionSessionUpdate', () => {
  it('asks for transcription at the rate the audio is sent in', () => {
    const update = buildTranscriptionSessionUpdate()

    expect(update.session.type).toBe('transcription')
    expect(update.session.audio.input.format.rate).toBe(LIVE_AUDIO_SAMPLE_RATE)
    expect(update.session.audio.input.transcription.model).toBe(
      'gpt-live-transcribe',
    )
  })

  it('does not ask for turn detection, which this model refuses outright', () => {
    // The API answers a turn_detection field with 400 invalid_value:
    // "Turn detection is not supported for this transcription model."
    expect(buildTranscriptionSessionUpdate().session.audio.input).not.toHaveProperty(
      'turn_detection',
    )
  })
})

describe('selectVisibleTranscript', () => {
  it('reads the live feed while recording, which runs ahead of the stored one', () => {
    expect(
      selectVisibleTranscript({
        isRecording: true,
        liveText: 'said a moment ago',
        storedText: 'said a while ago',
      }),
    ).toBe('said a moment ago')
  })

  it('holds the live text after stopping until the stored transcript arrives', () => {
    // The last chunks are still being transcribed here. Blanking the box as a
    // viva ends would read as the record having been lost.
    expect(
      selectVisibleTranscript({
        isRecording: false,
        liveText: 'everything that was said',
        storedText: '',
      }),
    ).toBe('everything that was said')
  })

  it('hands over to the stored transcript once it has landed', () => {
    expect(
      selectVisibleTranscript({
        isRecording: false,
        liveText: 'rough live text',
        storedText: 'the transcript that survives a refresh',
      }),
    ).toBe('the transcript that survives a refresh')
  })
})
