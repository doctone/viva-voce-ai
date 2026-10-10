import { CHUNK_TIMESLICE_MS } from "./vivaRecordingCapture";
import type { TranscriptSegment } from "./vivaTranscription";

export type TranscriptLinePart = {
  isMatch: boolean;
  text: string;
};

export type TranscriptLine = {
  parts: TranscriptLinePart[];
  sequence: number;
  /** Where the segment's chunk begins in the saved recording. */
  startSeconds: number;
};

export type TranscriptSearchResult = {
  lines: TranscriptLine[];
  /** Segments containing the query; zero when there is no query. */
  matchCount: number;
};

function splitOnQuery(text: string, query: string): TranscriptLinePart[] {
  const parts: TranscriptLinePart[] = [];
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  let cursor = 0;
  let matchAt = haystack.indexOf(needle);

  while (matchAt !== -1) {
    if (matchAt > cursor) {
      parts.push({ isMatch: false, text: text.slice(cursor, matchAt) });
    }

    parts.push({ isMatch: true, text: text.slice(matchAt, matchAt + needle.length) });
    cursor = matchAt + needle.length;
    matchAt = haystack.indexOf(needle, cursor);
  }

  if (cursor < text.length) {
    parts.push({ isMatch: false, text: text.slice(cursor) });
  }

  return parts;
}

/**
 * The saved recording is the chunks joined in order, so a segment's sequence
 * is enough to place it in the audio without storing timestamps.
 */
export function searchTranscript(
  segments: readonly TranscriptSegment[],
  rawQuery: string,
): TranscriptSearchResult {
  const query = rawQuery.trim();
  const lines = [...segments]
    .sort((left, right) => left.sequence - right.sequence)
    .map((segment) => ({ sequence: segment.sequence, text: segment.text.trim() }))
    .filter((segment) => segment.text !== "")
    .filter(
      (segment) =>
        query === "" || segment.text.toLowerCase().includes(query.toLowerCase()),
    )
    .map((segment) => ({
      parts:
        query === ""
          ? [{ isMatch: false, text: segment.text }]
          : splitOnQuery(segment.text, query),
      sequence: segment.sequence,
      startSeconds: (segment.sequence * CHUNK_TIMESLICE_MS) / 1000,
    }));

  return { lines, matchCount: query === "" ? 0 : lines.length };
}
