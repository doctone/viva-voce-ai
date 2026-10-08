export type Speaker = "teacher" | "student" | "unknown";

/** An utterance as the diarizing model returns it: offsets within the chunk. */
export type RawUtterance = {
  endMs: number;
  providerSpeaker: string;
  startMs: number;
  text: string;
};

export type AttributedUtterance = {
  confidence: number;
  endMs: number;
  speaker: Speaker;
  speakerSource: "model";
  startMs: number;
  text: string;
};

/** Must match the recorder's timeslice: chunk N starts N slices into the take. */
export const CHUNK_DURATION_MS = 15_000;

/** Speech beginning this soon after the teacher presses Ask is the teacher's. */
export const ASK_WINDOW_MS = 4_000;

/** Below this, attribution is stored as `unknown` rather than guessed. */
export const MIN_CONFIDENCE = 0.6;

/**
 * Decision (#93): attribution is anchored on timing, not voice. Provider
 * speaker ids are only meaningful inside one chunk, so each chunk is labelled
 * on its own evidence and never from ids seen in another chunk. That keeps the
 * labels consistent across a session without a stored mapping to go stale.
 * A voice sample from the equipment check would be a stronger anchor but needs
 * new capture UI; it can feed this same function later.
 *
 * Evidence per provider speaker: the share of its utterances that start within
 * ASK_WINDOW_MS after an Ask. A speaker that opens at least half of its
 * utterances that way is the teacher. In a chunk with exactly two speakers,
 * the other is the student, at reduced confidence. Everything else is unknown.
 */
export function attributeSpeakers(
  utterances: readonly RawUtterance[],
  chunkStartMs: number,
  askOffsetsMs: readonly number[],
): AttributedUtterance[] {
  const absolute = [...utterances]
    .map((utterance) => ({
      ...utterance,
      endMs: utterance.endMs + chunkStartMs,
      startMs: utterance.startMs + chunkStartMs,
    }))
    .sort((left, right) => left.startMs - right.startMs);

  const speakers = [...new Set(absolute.map((u) => u.providerSpeaker))];
  const teacherShare = new Map<string, number>();

  for (const speaker of speakers) {
    const own = absolute.filter((u) => u.providerSpeaker === speaker);
    const answeredAsk = own.filter((u) =>
      askOffsetsMs.some(
        (ask) => u.startMs >= ask && u.startMs - ask <= ASK_WINDOW_MS,
      ),
    );
    teacherShare.set(speaker, answeredAsk.length / own.length);
  }

  const teacher = [...speakers]
    .sort((a, b) => (teacherShare.get(b) ?? 0) - (teacherShare.get(a) ?? 0))
    .find((speaker) => (teacherShare.get(speaker) ?? 0) >= 0.5);

  return absolute.map((utterance) => {
    let speaker: Speaker = "unknown";
    let confidence = 0;

    if (teacher !== undefined) {
      if (utterance.providerSpeaker === teacher) {
        speaker = "teacher";
        confidence = teacherShare.get(teacher) ?? 0;
      } else if (speakers.length === 2) {
        speaker = "student";
        confidence = 0.7;
      }
    }

    if (confidence < MIN_CONFIDENCE) {
      speaker = "unknown";
    }

    return {
      confidence,
      endMs: utterance.endMs,
      speaker,
      speakerSource: "model",
      startMs: utterance.startMs,
      text: utterance.text,
    };
  });
}
