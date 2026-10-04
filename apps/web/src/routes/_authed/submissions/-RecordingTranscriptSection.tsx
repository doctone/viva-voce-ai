import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSupabaseBrowserClient } from "../../../utils/supabase-browser";
import {
  fetchRecordingTranscript,
} from "../../../features/submissions/recordingTranscript";
import {
  enqueueRecordingTranscriptionFn,
  processRecordingTranscriptionFn,
} from "../../../features/submissions/recordingTranscriptServerFn";
import { RecordingTranscriptPanel } from "./-RecordingTranscriptPanel";

const POLL_MS = 3000;

/** Loads, starts and retries the transcript for one recording, synced to its player. */
export function RecordingTranscriptSection({
  audioElement,
  submissionVivaId,
}: {
  audioElement: HTMLAudioElement | null;
  submissionVivaId: string;
}) {
  const queryClient = useQueryClient();
  const enqueue = useServerFn(enqueueRecordingTranscriptionFn);
  const process = useServerFn(processRecordingTranscriptionFn);
  const [currentSeconds, setCurrentSeconds] = React.useState(0);
  const queryKey = ["recording-transcript", submissionVivaId];

  const query = useQuery({
    queryFn: () =>
      fetchRecordingTranscript(getSupabaseBrowserClient(), submissionVivaId),
    queryKey,
    refetchInterval: (state) => {
      const status = state.state.data?.job?.status;
      return status === "queued" || status === "processing" ? POLL_MS : false;
    },
  });

  const start = React.useCallback(async () => {
    try {
      const queued = await enqueue({ data: { submissionVivaId } });
      await queryClient.invalidateQueries({ queryKey });
      if (queued.outcome === "queued" || queued.outcome === "unchanged") {
        // Fire and forget: the panel polls the job, and a failure lands on it.
        void process({ data: { submissionVivaId } }).finally(() =>
          queryClient.invalidateQueries({ queryKey }),
        );
      }
    } catch {
      // Transcription is optional; the recording is unaffected.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enqueue, process, queryClient, submissionVivaId]);

  const hasLoaded = query.isSuccess;
  const hasJob = Boolean(query.data?.job);

  React.useEffect(() => {
    if (hasLoaded && !hasJob) {
      void start();
    }
  }, [hasLoaded, hasJob, start]);

  React.useEffect(() => {
    if (!audioElement) {
      return;
    }
    const onTimeUpdate = () => setCurrentSeconds(audioElement.currentTime);
    audioElement.addEventListener("timeupdate", onTimeUpdate);
    return () => audioElement.removeEventListener("timeupdate", onTimeUpdate);
  }, [audioElement]);

  return (
    <RecordingTranscriptPanel
      currentSeconds={currentSeconds}
      job={query.data?.job ?? null}
      onRetry={() => void start()}
      onSeek={(seconds) => {
        if (audioElement) {
          audioElement.currentTime = seconds;
          void audioElement.play?.();
        }
      }}
      segments={query.data?.segments ?? []}
    />
  );
}
