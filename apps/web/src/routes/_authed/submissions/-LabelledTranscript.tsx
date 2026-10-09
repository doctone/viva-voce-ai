import { cn } from "~/lib/utils";
import { mutedTextClassName } from "~/lib/class-names";
import type { Speaker } from "../../../features/submissions/speakerAttribution";
import type {
  AskedQuestionWindow,
  StoredUtterance,
} from "../../../features/submissions/transcriptUtterances";
import {
  computeQuestionTalkTimes,
  computeTalkTime,
  describeStudentTalk,
  formatDuration,
  speakerLabel,
  TALK_TIME_NOTE,
} from "../../../features/submissions/talkTime";

export type LabelledTranscriptProps = {
  /** Words heard live but not yet in the stored transcript. Never labelled. */
  liveTail?: string;
  onCorrect: (utteranceId: string, speaker: Speaker) => void;
  questions: readonly AskedQuestionWindow[];
  studentFirstName?: string | null;
  utterances: readonly StoredUtterance[];
};

const SPEAKERS: Speaker[] = ["teacher", "student", "unknown"];

/** Who spoke each line, how long each side spoke, and a way to fix a label. */
export function LabelledTranscript({
  liveTail = "",
  onCorrect,
  questions,
  studentFirstName,
  utterances,
}: LabelledTranscriptProps) {
  const studentLabel = speakerLabel("student", studentFirstName);
  const session = computeTalkTime(utterances);
  const perQuestion = computeQuestionTalkTimes(utterances, questions);

  return (
    <div className="grid gap-4">
      <ol className="grid max-w-[80ch] gap-2">
        {utterances.map((utterance) => {
          const isUnclear = utterance.speaker === "unknown";
          const label = speakerLabel(utterance.speaker, studentFirstName);
          const selectId = `speaker-${utterance.id}`;

          return (
            <li
              className={cn(
                "grid gap-1 border-l-2 pl-3 text-sm leading-7 sm:grid-cols-[9rem_1fr_auto] sm:gap-3",
                isUnclear
                  ? "border-dashed border-outline italic"
                  : "border-solid border-primary",
              )}
              data-speaker={utterance.speaker}
              key={utterance.id}
            >
              <span className="font-medium uppercase tracking-wide text-xs leading-7">
                {label}
                {utterance.speakerSource === "teacher" ? (
                  <span className={cn(mutedTextClassName, "ml-1 normal-case")}>
                    (corrected)
                  </span>
                ) : null}
              </span>
              <span>{utterance.text}</span>
              <span>
                <label className="sr-only" htmlFor={selectId}>
                  Speaker for: {utterance.text.slice(0, 60)}
                </label>
                <select
                  className="rounded-md border border-outline bg-transparent p-1 text-xs text-on-surface"
                  id={selectId}
                  onChange={(event) =>
                    onCorrect(utterance.id, event.target.value as Speaker)
                  }
                  value={utterance.speaker}
                >
                  {SPEAKERS.map((speaker) => (
                    <option key={speaker} value={speaker}>
                      {speaker === "unknown"
                        ? "Unclear"
                        : speakerLabel(speaker, studentFirstName)}
                    </option>
                  ))}
                </select>
              </span>
            </li>
          );
        })}
      </ol>

      {liveTail !== "" ? (
        <p aria-live="polite" className="max-w-[80ch] text-sm leading-7">
          {liveTail}{" "}
          <span className={cn(mutedTextClassName, "text-xs")}>
            (speaker not yet known)
          </span>
        </p>
      ) : null}

      <section aria-label="Talk time" className="grid gap-2 text-sm leading-6">
        <h4 className="font-medium">Talk time</h4>
        <p>
          Whole viva: {describeStudentTalk(session, studentLabel)} · Teacher{" "}
          {formatDuration(session.teacherMs)}
          {session.unclearMs > 0
            ? ` · Speaker unclear ${formatDuration(session.unclearMs)}`
            : ""}{" "}
          · Longest unbroken {studentLabel} answer{" "}
          {formatDuration(session.longestStudentRunMs)}
        </p>
        {questions.length > 0 ? (
          <ul className="grid gap-1">
            {questions.map((question, index) => {
              const talk = perQuestion[index];

              return (
                <li key={question.id}>
                  <span className="font-medium">{question.prompt}</span>
                  <br />
                  {describeStudentTalk(talk, studentLabel)} · Teacher{" "}
                  {formatDuration(talk.teacherMs)}
                </li>
              );
            })}
          </ul>
        ) : null}
        <p className={cn(mutedTextClassName, "text-xs")}>{TALK_TIME_NOTE}</p>
      </section>
    </div>
  );
}
