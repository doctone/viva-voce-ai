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
  isVivaConclusion,
  validateForSigning,
  VIVA_CONCLUSIONS,
  type VivaConclusion,
  type VivaRecord,
  type VivaRecordDraftInput,
} from "../../../features/submissions/vivaRecord";
import { formatEvidenceMarkerLabel } from "../../../features/submissions/vivaSessionCapture";
import {
  currentContent,
  currentVersion,
  describeChangedField,
  originalContent,
  type AmendmentInput,
  type FieldChange,
  type SignedVivaRecord,
  type VivaRecordAmendment,
  type VivaRecordContent,
} from "../../../features/submissions/vivaRecordAmendment";

export type VivaRecordPanelProps = {
  amendments?: readonly VivaRecordAmendment[];
  /** Only the signing teacher may amend. */
  canAmend?: boolean;
  onAmend?: (input: AmendmentInput, expectedVersion: number) => Promise<void>;
  onSaveDraft: (input: VivaRecordDraftInput) => Promise<void>;
  onSign: (input: VivaRecordDraftInput) => Promise<void>;
  record: VivaRecord | null;
};

const fieldClassName =
  "w-full rounded-md border border-outline bg-transparent p-3 text-sm leading-6 text-on-surface";

export function VivaRecordPanel({
  amendments = [],
  canAmend = false,
  onAmend,
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
    return (
      <SignedRecord
        amendments={amendments}
        canAmend={canAmend && Boolean(onAmend)}
        onAmend={onAmend}
        record={record}
      />
    );
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

function formatChangeValue(field: FieldChange["field"], value: string) {
  if (field === "conclusion" && isVivaConclusion(value)) {
    return formatVivaConclusionLabel(value);
  }

  return value === "" ? "(empty)" : value;
}

function SignedRecord({
  amendments,
  canAmend,
  onAmend,
  record,
}: {
  amendments: readonly VivaRecordAmendment[];
  canAmend: boolean;
  onAmend?: VivaRecordPanelProps["onAmend"];
  record: SignedVivaRecord;
}) {
  const { snapshot } = record;
  const [showOriginal, setShowOriginal] = React.useState(false);
  const [isAmending, setIsAmending] = React.useState(false);
  const version = currentVersion(amendments);
  const current = currentContent(record, amendments);
  const shown = showOriginal ? originalContent(record) : current;

  return (
    <section
      aria-labelledby="viva-record-heading"
      className={cn(paperPanelClassName, "grid gap-4 p-5")}
    >
      <span className={eyebrowClassName}>
        {showOriginal
          ? "Original signed version"
          : version > 0
            ? `Signed Viva Record (amended, version ${version})`
            : "Signed Viva Record"}
      </span>
      <h2 className={subheadClassName} id="viva-record-heading">
        {formatVivaConclusionLabel(shown.conclusion)}
      </h2>
      <p className={cn(mutedTextClassName, "text-sm leading-6")}>
        Signed by {snapshot.teacher.name} on{" "}
        {new Date(record.signedAt).toLocaleString()}. The signed evidence is
        read-only.
      </p>
      <p className={cn(mutedTextClassName, "text-sm leading-6")}>
        Viva held {new Date(snapshot.session.startedAt).toLocaleString()} to{" "}
        {new Date(snapshot.session.endedAt).toLocaleString()}.
      </p>
      <p className="text-sm leading-6">{shown.conclusionRationale}</p>
      {shown.followUpAction ? (
        <p className="text-sm leading-6">
          <strong>Follow-up:</strong> {shown.followUpAction}
        </p>
      ) : null}
      <p className={cn(mutedTextClassName, "text-sm")}>
        {snapshot.recording
          ? `Recording: ${snapshot.recording.chunkCount} saved parts`
          : "No recording"}
      </p>
      <ol aria-label="Asked questions and evidence" className="grid gap-3">
        {snapshot.askedQuestions.map((question) => (
          <li className="grid gap-1 text-sm leading-6" key={question.id}>
            <span className="font-bold">{question.questionText}</span>
            <span className={mutedTextClassName}>
              {question.isUnplanned ? "Unplanned follow-up" : "Planned question"}
              {" · asked "}
              {new Date(question.askedAt).toLocaleTimeString()}
            </span>
            {question.observation ? (
              <span>Observation: {question.observation.content}</span>
            ) : null}
            {question.evidenceMarker ? (
              <span className={mutedTextClassName}>
                {formatEvidenceMarkerLabel(question.evidenceMarker.markerType)}
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      {version > 0 ? (
        <>
          <Button
            onClick={() => setShowOriginal((value) => !value)}
            variant="secondary"
          >
            {showOriginal ? "Show current version" : "Show original signed version"}
          </Button>
          <section aria-label="Amendment history" className="grid gap-3">
            <h3 className="text-sm font-bold">Amendment history</h3>
            <ol className="grid gap-3">
              {[...amendments]
                .sort((a, b) => a.version - b.version)
                .map((amendment) => (
                  <li className="grid gap-1 text-sm leading-6" key={amendment.id}>
                    <span className="font-bold">
                      Version {amendment.version} by {amendment.authorName},{" "}
                      {new Date(amendment.createdAt).toLocaleString()}
                    </span>
                    <span>Reason: {amendment.reason}</span>
                    <ul className="grid gap-1">
                      {amendment.changes.map((change) => (
                        <li key={change.field}>
                          {describeChangedField(change.field)}:{" "}
                          {formatChangeValue(change.field, change.from)} →{" "}
                          {formatChangeValue(change.field, change.to)}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
            </ol>
          </section>
        </>
      ) : null}

      {canAmend && onAmend ? (
        isAmending ? (
          <AmendForm
            current={current}
            key={version}
            onAmend={onAmend}
            onDone={() => setIsAmending(false)}
            version={version}
          />
        ) : (
          <Button onClick={() => setIsAmending(true)} variant="secondary">
            Amend this record
          </Button>
        )
      ) : null}
    </section>
  );
}

function AmendForm({
  current,
  onAmend,
  onDone,
  version,
}: {
  current: VivaRecordContent;
  onAmend: NonNullable<VivaRecordPanelProps["onAmend"]>;
  onDone: () => void;
  version: number;
}) {
  const [conclusion, setConclusion] = React.useState<VivaConclusion | null>(
    current.conclusion,
  );
  const [rationale, setRationale] = React.useState(current.conclusionRationale);
  const [followUp, setFollowUp] = React.useState(current.followUpAction);
  const [reason, setReason] = React.useState("");
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isBusy, setIsBusy] = React.useState(false);

  async function submit() {
    setIsBusy(true);
    setErrors([]);

    try {
      await onAmend(
        {
          conclusion,
          conclusionRationale: rationale,
          followUpAction: followUp,
          reason,
        },
        version,
      );
      onDone();
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : "Something went wrong.",
      ]);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <form
      aria-label="Amend Viva Record"
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <p className="text-sm leading-6">
        The signed original is kept. Your change is added as a new version under
        your name.
      </p>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-bold">Viva Conclusion</legend>
        {VIVA_CONCLUSIONS.map((option) => (
          <label className="flex items-center gap-2 text-sm" key={option}>
            <input
              checked={conclusion === option}
              disabled={isBusy}
              name="amend-conclusion"
              onChange={() => setConclusion(option)}
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
          onChange={(event) => setRationale(event.target.value)}
          rows={4}
          value={rationale}
        />
      </label>
      <label className="grid gap-1 text-sm font-bold">
        Follow-up action
        <textarea
          className={fieldClassName}
          disabled={isBusy}
          onChange={(event) => setFollowUp(event.target.value)}
          rows={3}
          value={followUp}
        />
      </label>
      <label className="grid gap-1 text-sm font-bold">
        Reason for amendment
        <textarea
          className={fieldClassName}
          disabled={isBusy}
          onChange={(event) => setReason(event.target.value)}
          rows={2}
          value={reason}
        />
      </label>
      {errors.length > 0 ? (
        <ul className="text-sm leading-6 text-error" role="alert">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button disabled={isBusy} type="submit">
          Save amendment
        </Button>
        <Button disabled={isBusy} onClick={onDone} variant="secondary">
          Cancel
        </Button>
      </div>
    </form>
  );
}
