export type SubmissionRecordingRef = {
  audioPath: string;
  id: string;
};

/**
 * A submission keeps one recording. Everything else is superseded.
 *
 * The keeper is passed in rather than inferred from timestamps: the caller has
 * just written it, and picking "the newest row" would depend on clock skew
 * between the client and the database at exactly the moment evidence is
 * deleted.
 */
export function selectSupersededRecordings(
  recordings: readonly SubmissionRecordingRef[],
  keepId: string,
): SubmissionRecordingRef[] {
  // A keeper missing from the list means the read raced the write. Deleting the
  // rest here would leave the submission with no recording at all.
  if (!recordings.some((recording) => recording.id === keepId)) {
    return [...recordings];
  }

  return recordings.filter((recording) => recording.id !== keepId);
}
