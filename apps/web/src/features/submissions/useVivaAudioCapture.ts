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
  retryFailedChunks: () => void;
  start: () => Promise<void>;
  status: RecordingStatus;
  stop: () => void;
  togglePause: () => void;
};

export function useVivaAudioCapture(vivaSessionId: string): VivaAudioCapture {
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

  const uploadChunk = React.useCallback(
    (sequence: number, blob: Blob) => {
      const mimeType = mimeTypeRef.current;

      if (!mimeType) {
        return;
      }

      pendingBlobsRef.current.set(sequence, blob);

      void uploadRecordingChunk(
        { blob, mimeType, sequence, vivaSessionId },
        repositoryRef.current,
      ).then((result) => {
        if (result.outcome === "uploaded") {
          pendingBlobsRef.current.delete(sequence);
        }

        setTracker((current) =>
          applyChunkUploadResult(current, sequence, result),
        );
      });
    },
    [vivaSessionId],
  );

  const start = React.useCallback(async () => {
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

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size === 0) {
          return;
        }

        const sequence = sequenceRef.current;
        sequenceRef.current += 1;
        uploadChunk(sequence, event.data);
      });

      recorderRef.current = recorder;
      recorder.start(CHUNK_TIMESLICE_MS);

      setStatus((current) =>
        transitionRecordingStatus(current, { type: "permission_granted" }),
      );
    } catch {
      setStatus((current) =>
        transitionRecordingStatus(current, { type: "permission_denied" }),
      );
    }
  }, [uploadChunk]);

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

  const stop = React.useCallback(() => {
    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;

    setStatus((current) =>
      transitionRecordingStatus(current, { type: "stop" }),
    );
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

  return {
    failedChunkCount: tracker.failedSequences.length,
    retryFailedChunks,
    start,
    status,
    stop,
    togglePause,
  };
}
