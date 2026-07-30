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
  evaluateReadiness,
  type ConsentState,
  type EquipmentCheckResult,
} from "../../../features/submissions/vivaSession";
import type { QuestionSetStatus } from "../../../features/submissions/vivaQuestionSet";

export type VivaSessionStartInput = {
  accessibilityAdjustments: string;
  consentDeclinedReason: string | null;
  consentState: ConsentState;
  equipmentCheckResult: "passed";
  expectedDurationMinutes: number;
};

export type VivaSessionReadinessPanelActiveSession = {
  startedAt: string;
};

type VivaSessionReadinessPanelProps = {
  activeSession: VivaSessionReadinessPanelActiveSession | null;
  estimatedDurationMinutes: number;
  onCheckEquipment: () => Promise<EquipmentCheckResult>;
  onStart: (input: VivaSessionStartInput) => Promise<void>;
  questionSetStatus: QuestionSetStatus;
  submissionExcerpt: string;
  submissionTitle: string;
  submittedAt: string;
};

function formatStartedAt(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatSubmittedAt(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function VivaSessionReadinessPanel({
  activeSession,
  estimatedDurationMinutes,
  onCheckEquipment,
  onStart,
  questionSetStatus,
  submissionExcerpt,
  submissionTitle,
  submittedAt,
}: VivaSessionReadinessPanelProps) {
  const initialDuration =
    estimatedDurationMinutes > 0 ? estimatedDurationMinutes : null;

  const [studentConfirmed, setStudentConfirmed] = React.useState(false);
  const [consentState, setConsentState] = React.useState<ConsentState | null>(
    null,
  );
  const [consentDeclinedReason, setConsentDeclinedReason] =
    React.useState("");
  const [equipmentCheckResult, setEquipmentCheckResult] =
    React.useState<EquipmentCheckResult | null>(null);
  const [isCheckingEquipment, setIsCheckingEquipment] = React.useState(false);
  const [expectedDurationMinutes, setExpectedDurationMinutes] = React.useState<
    number | null
  >(initialDuration);
  const [accessibilityAdjustments, setAccessibilityAdjustments] =
    React.useState("");
  const [isStarting, setIsStarting] = React.useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = React.useState(false);
  const [actionErrorMessage, setActionErrorMessage] = React.useState<
    string | null
  >(null);

  function resetForm() {
    setIsConfirmingReset(false);
    setStudentConfirmed(false);
    setConsentState(null);
    setConsentDeclinedReason("");
    setEquipmentCheckResult(null);
    setExpectedDurationMinutes(initialDuration);
    setAccessibilityAdjustments("");
    setActionErrorMessage(null);
  }

  async function runEquipmentCheck() {
    setIsCheckingEquipment(true);
    setActionErrorMessage(null);

    try {
      const result = await onCheckEquipment();
      setEquipmentCheckResult(result);
    } catch {
      setEquipmentCheckResult("failed");
    } finally {
      setIsCheckingEquipment(false);
    }
  }

  const validation = evaluateReadiness({
    accessibilityAdjustments,
    consentDeclinedReason,
    consentState,
    equipmentCheckResult,
    expectedDurationMinutes,
    questionSetStatus,
    studentConfirmed,
  });

  async function handleStart() {
    if (!validation.isReady || consentState === null) {
      return;
    }

    setIsStarting(true);
    setActionErrorMessage(null);

    try {
      await onStart({
        accessibilityAdjustments,
        consentDeclinedReason:
          consentState === "recording_disabled"
            ? consentDeclinedReason.trim()
            : null,
        consentState,
        equipmentCheckResult: "passed",
        expectedDurationMinutes: expectedDurationMinutes as number,
      });
    } catch (error) {
      setActionErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not start the Viva Session.",
      );
    } finally {
      setIsStarting(false);
    }
  }

  if (questionSetStatus !== "ready") {
    return (
      <section
        className={cn(paperPanelClassName, "bg-surface-container-low p-8")}
      >
        <div className="grid gap-3">
          <span className={eyebrowClassName}>Viva Session</span>
          <h2 className={subheadClassName}>
            Readiness check
          </h2>
          <p className={cn(mutedTextClassName, "text-sm leading-6")}>
            Mark the Viva Question Set ready before starting a Viva Session.
          </p>
        </div>
      </section>
    );
  }

  if (activeSession) {
    return (
      <section
        className={cn(paperPanelClassName, "bg-surface-container-low p-8")}
      >
        <div className="grid gap-3">
          <span className={eyebrowClassName}>Viva Session</span>
          <h2 className={subheadClassName}>
            Viva Session in progress
          </h2>
          <p className={cn(mutedTextClassName, "text-sm leading-6")}>
            Started {formatStartedAt(activeSession.startedAt)}.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={cn(paperPanelClassName, "bg-surface-container-low p-8")}>
      <div className="grid gap-5">
        <div className="grid gap-2">
          <span className={eyebrowClassName}>Viva Session</span>
          <h2 className={subheadClassName}>
            Readiness check
          </h2>
          <p className={cn(mutedTextClassName, "text-sm leading-6")}>
            Confirm the details below to open a Viva Session. This prepares the
            session record — it does not start recording.
          </p>
        </div>

        <div className="grid gap-3 border border-outline-variant bg-surface-container-lowest p-4">
          <span className={eyebrowClassName}>Check against the work</span>
          <dl className="grid gap-2 text-sm leading-6">
            <div className="grid gap-0.5">
              <dt className={cn(mutedTextClassName, "text-sm")}>Title</dt>
              <dd className="font-medium text-on-surface">{submissionTitle}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className={cn(mutedTextClassName, "text-sm")}>Submitted</dt>
              <dd className="font-medium text-on-surface">
                {formatSubmittedAt(submittedAt)}
              </dd>
            </div>
            {submissionExcerpt ? (
              <div className="grid gap-0.5">
                <dt className={cn(mutedTextClassName, "text-sm")}>Opens with</dt>
                <dd className="font-serif leading-6 text-on-surface">
                  “{submissionExcerpt}”
                </dd>
              </div>
            ) : null}
          </dl>
          <label className="flex items-start gap-3 text-sm leading-6 text-on-surface">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0"
              checked={studentConfirmed}
              onChange={(event) => setStudentConfirmed(event.target.checked)}
            />
            <span>
              I have checked this work with the student in front of me, and it is
              theirs.
            </span>
          </label>
        </div>

        <fieldset className="grid gap-2">
          <legend className="text-sm font-bold text-on-surface">
            Recording consent
          </legend>
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input
              type="radio"
              name="consentState"
              checked={consentState === "consent_given"}
              onChange={() => setConsentState("consent_given")}
            />
            Consent given to record this viva
          </label>
          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input
              type="radio"
              name="consentState"
              checked={consentState === "recording_disabled"}
              onChange={() => setConsentState("recording_disabled")}
            />
            Recording is disabled for this session
          </label>
          {consentState === "recording_disabled" ? (
            <label
              className="grid gap-1 text-sm"
              htmlFor="consentDeclinedReason"
            >
              Reason recording is disabled
              <textarea
                id="consentDeclinedReason"
                rows={2}
                value={consentDeclinedReason}
                onChange={(event) =>
                  setConsentDeclinedReason(event.target.value)
                }
                className="border border-outline-variant bg-surface-container-lowest p-2"
              />
            </label>
          ) : null}
        </fieldset>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            isLoading={isCheckingEquipment}
            onClick={() => void runEquipmentCheck()}
          >
            Run microphone check
          </Button>
          <span
            role="status"
            className={cn(
              "text-sm",
              equipmentCheckResult === "failed"
                ? "text-error"
                : "text-on-surface-variant",
            )}
          >
            {equipmentCheckResult === "passed"
              ? "Microphone check passed"
              : equipmentCheckResult === "failed"
                ? "Microphone check failed. Check your microphone and try again."
                : "Not checked yet"}
          </span>
        </div>

        <label
          className="grid gap-1 text-sm"
          htmlFor="expectedDurationMinutes"
        >
          Expected duration (minutes)
          <input
            id="expectedDurationMinutes"
            type="number"
            min={1}
            value={expectedDurationMinutes ?? ""}
            onChange={(event) => {
              const value = event.target.value.trim();

              if (value.length === 0) {
                setExpectedDurationMinutes(null);
                return;
              }

              const parsed = Number(value);
              setExpectedDurationMinutes(Number.isFinite(parsed) ? parsed : null);
            }}
            className="border border-outline-variant bg-surface-container-lowest p-2"
          />
        </label>

        <label
          className="grid gap-1 text-sm"
          htmlFor="accessibilityAdjustments"
        >
          Accessibility adjustments (optional)
          <textarea
            id="accessibilityAdjustments"
            rows={2}
            value={accessibilityAdjustments}
            onChange={(event) =>
              setAccessibilityAdjustments(event.target.value)
            }
            className="border border-outline-variant bg-surface-container-lowest p-2"
          />
        </label>

        {!validation.isReady ? (
          <div className="grid gap-1" id="readinessBlockingReasons">
            <span className={cn(mutedTextClassName, "text-sm")}>
              Before you start
            </span>
            <ul className="grid list-disc gap-1 pl-5 text-sm text-on-surface-variant">
              {validation.blockingReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {actionErrorMessage ? (
          <p className="text-sm text-error" role="alert">
            {actionErrorMessage}
          </p>
        ) : null}

        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={!validation.isReady}
              aria-describedby={
                validation.isReady ? undefined : "readinessBlockingReasons"
              }
              isLoading={isStarting}
              onClick={() => void handleStart()}
            >
              Open Viva Session
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsConfirmingReset(true)}
            >
              Clear checklist
            </Button>
          </div>
          {isConfirmingReset ? (
            <div
              className="grid gap-2 border border-outline-variant bg-surface-container-lowest p-4"
              role="alertdialog"
              aria-label="Clear the readiness checklist"
            >
              <p className="text-sm leading-6 text-on-surface">
                Clearing discards everything you have entered on this checklist.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={resetForm}>
                  Clear checklist
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsConfirmingReset(false)}
                >
                  Keep my answers
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
