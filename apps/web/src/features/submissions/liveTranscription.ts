/**
 * Live transcription over the realtime API.
 *
 * This runs *alongside* the chunk pipeline rather than replacing it. The chunk
 * pipeline is the record: durable, stored, and reconstructable after a crash.
 * This is for the teacher's eyes during the viva — best effort, never saved,
 * and safe to lose. If the socket drops mid-sentence, the evidence is untouched.
 */

/** The realtime API takes 24kHz mono PCM16. */
export const LIVE_AUDIO_SAMPLE_RATE = 24_000;

export const LIVE_TRANSCRIPTION_MODEL = "gpt-live-transcribe";

export type LiveTranscriptionState = {
  /** Text the model has committed to and will not revise. */
  committed: string;
  /** The sentence in progress, which may still change. */
  pending: string;
};

export const INITIAL_LIVE_TRANSCRIPTION_STATE: LiveTranscriptionState = {
  committed: "",
  pending: "",
};

export type LiveTranscriptionEvent =
  | { delta: string; type: "conversation.item.input_audio_transcription.delta" }
  | {
      transcript: string;
      type: "conversation.item.input_audio_transcription.completed";
    }
  | { type: string };

/**
 * Folds one realtime event into the visible transcript.
 *
 * Deltas accumulate into `pending` so a half-spoken sentence appears as it is
 * said; a completed event replaces that guess with the model's final wording
 * rather than appending to it, because the two overlap.
 */
export function applyLiveTranscriptionEvent(
  state: LiveTranscriptionState,
  event: LiveTranscriptionEvent,
): LiveTranscriptionState {
  if (event.type === "conversation.item.input_audio_transcription.delta") {
    const { delta } = event as { delta: string };

    return { ...state, pending: state.pending + delta };
  }

  if (event.type === "conversation.item.input_audio_transcription.completed") {
    const { transcript } = event as { transcript: string };
    const finished = transcript.trim();

    if (finished === "") {
      return { ...state, pending: "" };
    }

    return {
      committed:
        state.committed === "" ? finished : `${state.committed} ${finished}`,
      pending: "",
    };
  }

  return state;
}

/** What the teacher reads: settled text plus whatever is being said now. */
export function renderLiveTranscript(state: LiveTranscriptionState): string {
  return [state.committed, state.pending.trim()]
    .filter((part) => part !== "")
    .join(" ");
}

/**
 * Which transcript the teacher should be reading.
 *
 * While recording, the live feed — it runs seconds ahead of the stored one.
 * After stopping, the stored transcript takes over, but only once it has
 * something in it: the final chunks are still being transcribed then, and
 * blanking the box at the moment a viva ends would look like the record had
 * been lost.
 */
export function selectVisibleTranscript({
  isRecording,
  liveText,
  storedText,
}: {
  isRecording: boolean;
  liveText: string;
  storedText: string;
}): string {
  if (isRecording) {
    return liveText;
  }

  return storedText === "" ? liveText : storedText;
}

/**
 * Float samples in −1..1 to signed 16-bit, clamped.
 *
 * Values outside the range wrap rather than clip if left unclamped, turning a
 * loud passage into noise.
 */
export function encodePcm16(samples: Float32Array): Int16Array {
  const encoded = new Int16Array(samples.length);

  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]));
    encoded[index] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  return encoded;
}

export function encodeBase64(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

/**
 * No `turn_detection` and no `input_audio_buffer.commit`: this model rejects
 * turn detection and emits deltas continuously while audio is appended.
 */
export function buildTranscriptionSessionUpdate() {
  return {
    session: {
      audio: {
        input: {
          format: { rate: LIVE_AUDIO_SAMPLE_RATE, type: "audio/pcm" },
          transcription: { model: LIVE_TRANSCRIPTION_MODEL },
        },
      },
      type: "transcription",
    },
    type: "session.update",
  };
}

export function buildAudioAppendMessage(base64Audio: string) {
  return { audio: base64Audio, type: "input_audio_buffer.append" };
}
