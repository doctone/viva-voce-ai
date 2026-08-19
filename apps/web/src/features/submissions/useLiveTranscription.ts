import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  applyLiveTranscriptionEvent,
  buildAudioAppendMessage,
  buildTranscriptionSessionUpdate,
  encodeBase64,
  encodePcm16,
  INITIAL_LIVE_TRANSCRIPTION_STATE,
  LIVE_AUDIO_SAMPLE_RATE,
  renderLiveTranscript,
  type LiveTranscriptionState,
} from "./liveTranscription";
import { createRealtimeTranscriptionTokenFn } from "./realtimeTokenServerFn";

const REALTIME_URL = "wss://api.openai.com/v1/realtime?intent=transcription";
const AUDIO_BUFFER_SIZE = 4096;

export type LiveTranscription = {
  errorMessage: string | null;
  isConnected: boolean;
  text: string;
};

/**
 * Streams microphone audio to the realtime API and returns the text as it is
 * spoken.
 *
 * Deliberately best-effort. Every failure — no token, a refused socket, a
 * dropped connection — leaves the recording and the stored transcript
 * untouched, because those come from the chunk pipeline and never from here.
 */
export function useLiveTranscription(
  getMediaStream: () => MediaStream | null,
  isActive: boolean,
): LiveTranscription {
  const createToken = useServerFn(createRealtimeTranscriptionTokenFn);
  const [state, setState] = React.useState<LiveTranscriptionState>(
    INITIAL_LIVE_TRANSCRIPTION_STATE,
  );
  const [isConnected, setIsConnected] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const stream = getMediaStream();

    if (!isActive || !stream || typeof WebSocket === "undefined") {
      return;
    }

    let socket: WebSocket | null = null;
    let audioContext: AudioContext | null = null;
    let isCancelled = false;

    const connect = async () => {
      let token: { model: string; value: string };

      try {
        token = await createToken({});
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Live transcription is unavailable.",
        );
        return;
      }

      if (isCancelled) {
        return;
      }

      // The ephemeral token travels as a subprotocol: browsers cannot set
      // headers on a WebSocket handshake.
      socket = new WebSocket(REALTIME_URL, [
        "realtime",
        `openai-insecure-api-key.${token.value}`,
      ]);

      socket.addEventListener("open", () => {
        setIsConnected(true);
        setErrorMessage(null);
        socket?.send(JSON.stringify(buildTranscriptionSessionUpdate()));

        audioContext = new AudioContext({ sampleRate: LIVE_AUDIO_SAMPLE_RATE });
        const source = audioContext.createMediaStreamSource(stream);
        // ScriptProcessor is deprecated in favour of AudioWorklet, which needs
        // a separately served module. This runs for the length of one viva on
        // a single mono track, which it handles without trouble.
        const processor = audioContext.createScriptProcessor(
          AUDIO_BUFFER_SIZE,
          1,
          1,
        );

        processor.addEventListener("audioprocess", (event) => {
          if (socket?.readyState !== WebSocket.OPEN) {
            return;
          }

          const samples = event.inputBuffer.getChannelData(0);
          const pcm = encodePcm16(samples);

          socket.send(
            JSON.stringify(
              buildAudioAppendMessage(
                encodeBase64(new Uint8Array(pcm.buffer)),
              ),
            ),
          );
        });

        source.connect(processor);
        // Routed to a silent destination: the processor only runs while it is
        // connected to one, and the teacher must not hear their own voice.
        const silence = audioContext.createGain();
        silence.gain.value = 0;
        processor.connect(silence);
        silence.connect(audioContext.destination);
      });

      socket.addEventListener("message", (event) => {
        try {
          setState((current) =>
            applyLiveTranscriptionEvent(current, JSON.parse(event.data)),
          );
        } catch {
          // A frame that will not parse is one lost word, not a failed viva.
        }
      });

      socket.addEventListener("error", () => {
        setErrorMessage("Live transcription disconnected.");
        setIsConnected(false);
      });

      socket.addEventListener("close", () => setIsConnected(false));
    };

    void connect();

    return () => {
      isCancelled = true;
      socket?.close();
      void audioContext?.close();
      setIsConnected(false);
    };
  }, [createToken, getMediaStream, isActive]);

  // Cleared when a take begins, not when it ends: after stopping, this text is
  // all the teacher has until the stored transcript catches up.
  React.useEffect(() => {
    if (isActive) {
      setState(INITIAL_LIVE_TRANSCRIPTION_STATE);
      setErrorMessage(null);
    }
  }, [isActive]);

  return {
    errorMessage,
    isConnected,
    text: renderLiveTranscript(state),
  };
}
