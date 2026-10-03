import * as React from "react";
import { Button } from "../../../components/ui/Button";
import { cn } from "~/lib/utils";
import {
  eyebrowClassName,
  mutedTextClassName,
  paperPanelClassName,
  subheadClassName,
} from "~/lib/class-names";
import {
  formatVivaConclusionLabel,
  validateForSigning,
  VIVA_CONCLUSIONS,
  type VivaConclusion,
  type VivaRecord,
  type VivaRecordDraftInput,
} from "../../../features/submissions/vivaRecord";
import { formatEvidenceMarkerLabel } from "../../../features/submissions/vivaSessionCapture";

export type VivaRecordPanelProps = {
  onSaveDraft: (input: VivaRecordDraftInput) => Promise<void>;
  onSign: (input: VivaRecordDraftInput) => Promise<void>;
  record: VivaRecord | null;
};

const fieldClassName =
  "w-full rounded-md border border-outline bg-transparent p-3 text-sm leading-6 text-on-surface";

export function VivaRecordPanel({
  onSaveDraft,
  onSign,
  record,
}: VivaRecordPanelProps) {
  const [conclusion, setConclusion] = React.useState<VivaConclusion | null>(
    record?.conclusion ?? null,
  );
  const [rationale, setRationale] = React.useState(
    record?.conclusionRationale ?? "",
  );
  const [followUp, setFollowUp] = React.useState(record?.followUpAction ?? "");
  const [confirming, setConfirming] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isBusy, setIsBusy] = React.useState(false);

  if (record?.status === "signed") {
    return <SignedRecord record={record} />;
  }

  const input: VivaRecordDraftInput = {
    conclusion,
    conclusionRationale: rationale,
    followUpAction: followUp,
  };

  async function run(action: (input: VivaRecordDraftInput) => Promise<void>) {
    setIsBusy(true);
    setErrors([]);

    try {
      await action(input);
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : "Something went wrong.",
      ]);
    } finally {
      setIsBusy(false);
      setConfirming(false);
    }
  }

  function requestSign() {
    const reasons = validateForSigning(input);

    setErrors(reasons);
    setConfirming(reasons.length === 0);
  }

  return (
    <section
      aria-labelledby="viva-record-heading"
      className={cn(paperPanelClassName, "grid gap-4 p-5")}
    >
      <span className={eyebrowClassName}>Viva Record</span>
      <h2 className={subheadClassName} id="viva-record-heading">
        Conclude this viva
      </h2>
      <p className={cn(mutedTextClassName, "text-sm leading-6")}>
        The viva has ended. Nothing is decided or signed until you do it here.
      </p>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-bold">Viva Conclusion</legend>
        {VIVA_CONCLUSIONS.map((option) => (
          <label className="flex items-center gap-2 text-sm" key={option}>
            <input
              checked={conclusion === option}
              disabled={isBusy}
              name="viva-conclusion"
              onChange={() => {
                setConclusion(option);
                setConfirming(false);
              }}
              type="radio"
              value={option}
            />
            {formatVivaConclusionLabel(option)}
          </label>
        ))}
      </fieldset>

      <label className="grid gap-1 text-sm font-bold">
        Explain your conclusion
        <textarea
          className={fieldClassName}
          disabled={isBusy}
          onChange={(event) => {
            setRationale(event.target.value);
            setConfirming(false);
          }}
          rows={4}
          value={rationale}
        />
      </label>

      <label className="grid gap-1 text-sm font-bold">
        Follow-up action
        <textarea
          className={fieldClassName}
          disabled={isBusy}
          onChange={(event) => {
            setFollowUp(event.target.value);
            setConfirming(false);
          }}
          rows={3}
          value={followUp}
        />
      </label>

      {errors.length > 0 ? (
        <ul className="text-sm leading-6 text-error" role="alert">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}

      {confirming ? (
        <div className="grid gap-3" role="group" aria-label="Confirm signing">
          <p className="text-sm leading-6">
            Signing freezes this Viva Record. Its conclusion and evidence cannot
            be edited afterwards.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button disabled={isBusy} onClick={() => void run(onSign)}>
              Confirm and sign
            </Button>
            <Button
              disabled={isBusy}
              onClick={() => setConfirming(false)}
              variant="secondary"
            >
              Keep editing
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <Button disabled={isBusy} onClick={requestSign}>
            Sign Viva Record
          </Button>
          <Button
            disabled={isBusy}
            onClick={() => void run(onSaveDraft)}
            variant="secondary"
          >
            Save draft
          </Button>
        </div>
      )}
    </section>
  );
}

function SignedRecord({
  record,
}: {
  record: Extract<VivaRecord, { status: "signed" }>;
}) {
  const { snapshot } = record;

  return (
    <section
      aria-labelledby="viva-record-heading"
      className={cn(paperPanelClassName, "grid gap-4 p-5")}
    >
      <span className={eyebrowClassName}>Signed Viva Record</span>
      <h2 className={subheadClassName} id="viva-record-heading">
        {formatVivaConclusionLabel(record.conclusion)}
      </h2>
      <p className={cn(mutedTextClassName, "text-sm leading-6")}>
        Signed by {snapshot.teacher.name} on{" "}
        {new Date(record.signedAt).toLocaleString()}. This record is read-only.
      </p>
      <p className="text-sm leading-6">{record.conclusionRationale}</p>
      {record.followUpAction ? (
        <p className="text-sm leading-6">
          <strong>Follow-up:</strong> {record.followUpAction}
        </p>
      ) : null}
      <p className={cn(mutedTextClassName, "text-sm")}>
        {snapshot.recording
          ? `Recording: ${snapshot.recording.chunkCount} saved parts`
          : "No recording"}
      </p>
      <ol className="grid gap-3">
        {snapshot.askedQuestions.map((question) => (
          <li className="grid gap-1 text-sm leading-6" key={question.id}>
            <span className="font-bold">{question.questionText}</span>
            {question.observation ? (
              <span>{question.observation.content}</span>
            ) : null}
            {question.evidenceMarker ? (
              <span className={mutedTextClassName}>
                {formatEvidenceMarkerLabel(question.evidenceMarker.markerType)}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
