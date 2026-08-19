import { createServerFn } from '@tanstack/react-start'
import {
  LIVE_AUDIO_SAMPLE_RATE,
  LIVE_TRANSCRIPTION_MODEL,
} from './liveTranscription'

const CLIENT_SECRETS_ENDPOINT = 'https://api.openai.com/v1/realtime/client_secrets'

export type RealtimeTranscriptionToken = {
  model: string
  value: string
}

/**
 * Mints a short-lived token for the browser to open its own transcription
 * socket with.
 *
 * No `turn_detection`: the live transcription model rejects it outright
 * ("Turn detection is not supported for this transcription model") and needs
 * no turns — it streams deltas continuously for as long as audio arrives. The account API key stays on the server: a browser holding it
 * could run anything on the account, and this one is only good for one
 * transcription session.
 */
export const createRealtimeTranscriptionTokenFn = createServerFn({
  method: 'POST',
}).handler(async (): Promise<RealtimeTranscriptionToken> => {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.')
  }

  const response = await fetch(CLIENT_SECRETS_ENDPOINT, {
    body: JSON.stringify({
      session: {
        audio: {
          input: {
            format: { rate: LIVE_AUDIO_SAMPLE_RATE, type: 'audio/pcm' },
            transcription: { model: LIVE_TRANSCRIPTION_MODEL },
          },
        },
        type: 'transcription',
      },
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(
      `Could not start live transcription (status ${response.status}).`,
    )
  }

  const token = (await response.json()) as { value?: string }

  if (!token.value) {
    throw new Error('Live transcription token was missing from the response.')
  }

  return { model: LIVE_TRANSCRIPTION_MODEL, value: token.value }
})
