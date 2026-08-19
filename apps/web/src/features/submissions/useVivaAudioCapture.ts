import * as React from "react";
import { getSupabaseBrowserClient } from "../../utils/supabase-browser";
import {
  applyChunkUploadResult,
  createSupabaseRecordingChunkRepository,
  negotiateRecordingMimeType,
  transitionRecordingStatus,
  uploadRecordingChunk,
  INITIAL_CHUNK_UPLOAD_TRACKER_STATE,
  type ChunkUploadTrackerState,
  type RecordingStatus,
} from "./vivaRecordingCapture";

const CHUNK_TIMESLICE_MS = 15_000;

export type VivaAudioCapture = {
  failedChunkCount: number;
  /**
   * Everything captured this run, joined in order. MediaRecorder timeslices are
   * fragments of one stream, so concatenating them yields a playable file.
   * Null until the first chunk arrives.
   */
  getMediaStream: () => MediaStream | null;
  getRecordingBlob: () => Blob | null;
  retryFailedChunks: () => void;
  start: () => Promise<void>;
  status: RecordingStatus;
  /**
   * Resolves with the finished recording once the recorder has flushed.
   *
   * `MediaRecorder.stop()` emits its final timeslice asynchronously, so reading
   * the blob straight after stopping loses the last segment — and loses the
   * whole take when it was shorter than one timeslice and nothing had been
   * emitted yet.
   */
  stop: () => Promise<Blob | null>;
  togglePause: () => void;
};

/**
 * `resolveVivaSessionId` runs once the microphone is actually available, not
 * before: a session that exists only because a teacher was asked for the mic
 * and said no is a session that never happened. Callers that already hold a
 * session id can resolve immediately.
 */
export function useVivaAudioCapture(
  resolveVivaSessionId: () => Promise<string>,
  onChunkUploaded?: (vivaSessionId: string, sequence: number) => void,
): VivaAudioCapture {
  const [status, setStatus] = React.useState<RecordingStatus>("idle");
  const [tracker, setTracker] = React.useState<ChunkUploadTrackerState>(
    INITIAL_CHUNK_UPLOAD_TRACKER_STATE,
  );

  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const mimeTypeRef = React.useRef<string | null>(null);
  const sequenceRef = React.useRef(0);
  const pendingBlobsRef = React.useRef<Map<number, Blob>>(new Map());
  const repositoryRef = React.useRef(
    createSupabaseRecordingChunkRepository(getSupabaseBrowserClient()),
  );
  const vivaSessionIdRef = React.useRef<string | null>(null);
  // Held in a ref so a caller passing an inline callback cannot detach the
  // recorder's dataavailable listener mid-viva.
  const onChunkUploadedRef = React.useRef(onChunkUploaded);
  onChunkUploadedRef.current = onChunkUploaded;
  const recordedBlobsRef = React.useRef<Blob[]>([]);

  const uploadChunk = React.useCallback(
    (sequence: number, blob: Blob) => {
      const mimeType = mimeTypeRef.current;
      const vivaSessionId = vivaSessionIdRef.current;

      if (!mimeType || !vivaSessionId) {
        return;
      }

      pendingBlobsRef.current.set(sequence, blob);

      void uploadRecordingChunk(
        { blob, mimeType, sequence, vivaSessionId },
        repositoryRef.current,
      ).then((result) => {
        if (result.outcome === "uploaded") {
          pendingBlobsRef.current.delete(sequence);
          onChunkUploadedRef.current?.(vivaSessionId, sequence);
        }

        setTracker((current) =>
          applyChunkUploadResult(current, sequence, result),
        );
      });
    },
    [],
  );

  const start = React.useCallback(async () => {
    // A second start while one is already running would leave the first
    // recorder alive, emitting chunks into the new session and colliding on
    // sequence numbers. One recorder at a time.
    if (recorderRef.current || streamRef.current) {
      return;
    }

    setStatus((current) =>
      transitionRecordingStatus(current, { type: "start_requested" }),
    );

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mimeType = negotiateRecordingMimeType((type) =>
        MediaRecorder.isTypeSupported(type),
      );

      if (!mimeType) {
        stream.getTracks().forEach((track) => track.stop());
        setStatus((current) =>
          transitionRecordingStatus(current, { type: "permission_denied" }),
        );
        return;
      }

      streamRef.current = stream;
      mimeTypeRef.current = mimeType;
      vivaSessionIdRef.current = await resolveVivaSessionId();
      sequenceRef.current = 0;
      recordedBlobsRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size === 0) {
          return;
        }

        const sequence = sequenceRef.current;
        sequenceRef.current += 1;
        recordedBlobsRef.current.push(event.data);
        uploadChunk(sequence, event.data);
      });

      recorderRef.current = recorder;
      recorder.start(CHUNK_TIMESLICE_MS);

      setStatus((current) =>
        transitionRecordingStatus(current, { type: "permission_granted" }),
      );
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStatus((current) =>
        transitionRecordingStatus(current, { type: "permission_denied" }),
      );
    }
  }, [resolveVivaSessionId, uploadChunk]);

  const togglePause = React.useCallback(() => {
    const recorder = recorderRef.current;

    if (!recorder) {
      return;
    }

    setStatus((current) => {
      if (current === "recording") {
        recorder.pause();
        return transitionRecordingStatus(current, { type: "pause" });
      }

      if (current === "paused") {
        recorder.resume();
        return transitionRecordingStatus(current, { type: "resume" });
      }

      return current;
    });
  }, []);

  const stop = React.useCallback(async () => {
    const recorder = recorderRef.current;

    const flushed =
      recorder && recorder.state !== "inactive"
        ? new Promise<void>((resolve) => {
            recorder.addEventListener("stop", () => resolve(), { once: true });
            recorder.stop();
          })
        : Promise.resolve();

    await flushed;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;

    setStatus((current) =>
      transitionRecordingStatus(current, { type: "stop" }),
    );

    return getRecordingBlobRef.current();
  }, []);

  const retryFailedChunks = React.useCallback(() => {
    for (const sequence of tracker.failedSequences) {
      const blob = pendingBlobsRef.current.get(sequence);

      if (blob) {
        uploadChunk(sequence, blob);
      }
    }
  }, [tracker.failedSequences, uploadChunk]);

  React.useEffect(() => {
    return () => {
      const recorder = recorderRef.current;

      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const getRecordingBlobRef = React.useRef<() => Blob | null>(() => null);

  const getRecordingBlob = React.useCallback(() => {
    const blobs = recordedBlobsRef.current;

    if (blobs.length === 0) {
      return null;
    }

    return new Blob(blobs, { type: mimeTypeRef.current ?? blobs[0].type });
  }, []);

  getRecordingBlobRef.current = getRecordingBlob;

  const getMediaStream = React.useCallback(() => streamRef.current, []);

  return {
    failedChunkCount: tracker.failedSequences.length,
    getMediaStream,
    getRecordingBlob,
    retryFailedChunks,
    start,
    status,
    stop,
    togglePause,
  };
}
