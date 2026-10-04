import * as React from "react";
import { RecordingTranscriptSection } from "./-RecordingTranscriptSection";

/** The player for one recording, with its synchronized transcript beneath. */
export function RecordingPlayback({
  signedUrl,
  submissionVivaId,
}: {
  signedUrl: string;
  submissionVivaId: string;
}) {
  const [audioElement, setAudioElement] =
    React.useState<HTMLAudioElement | null>(null);

  return (
    <div className="grid gap-3">
      <audio
        className="h-9 w-full"
        controls
        data-testid="submission-viva-player"
        ref={setAudioElement}
        src={signedUrl}
      >
        <track kind="captions" />
      </audio>
      <RecordingTranscriptSection
        audioElement={audioElement}
        submissionVivaId={submissionVivaId}
      />
    </div>
  );
}
