import * as React from "react";
import { Button } from "../../../components/ui/Button";
import { cn } from "~/lib/utils";
import {
  eyebrowClassName,
  mutedTextClassName,
  paperPanelClassName,
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
  studentId: string;
  submissionTitle: string;
};

function formatStartedAt(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function VivaSessionReadinessPanel({
  activeSession,
  estimatedDurationMinutes,
  onCheckEquipment,
  onStart,
  questionSetStatus,
  studentId,
  submissionTitle,
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
  const [actionErrorMessage, setActionErrorMessage] = React.useState<
    string | null
  >(null);

  function resetForm() {
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
          <h2 className="font-display text-[28px] font-medium leading-[1.3] tracking-[-0.01em] text-primary">
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
          <h2 className="font-display text-[28px] font-medium leading-[1.3] tracking-[-0.01em] text-primary">
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
          <h2 className="font-display text-[28px] font-medium leading-[1.3] tracking-[-0.01em] text-primary">
            Readiness check
          </h2>
          <p className={cn(mutedTextClassName, "text-sm leading-6")}>
            Confirm the details below to start a Viva Session for this
            submission.
          </p>
        </div>

        <label className="flex items-start gap-3 text-sm leading-6 text-on-surface">
          <input
            type="checkbox"
            checked={studentConfirmed}
            onChange={(event) => setStudentConfirmed(event.target.checked)}
          />
          <span>
            I&apos;ve confirmed this is the correct student ({studentId}) and
            submission (&quot;{submissionTitle}&quot;).
          </span>
        </label>

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
          <span className="text-sm text-on-surface-variant">
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
              const value = event.target.value;
              setExpectedDurationMinutes(
                value.trim().length === 0 ? null : Number(value),
              );
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
          <div className="grid gap-1">
            <span className={cn(mutedTextClassName, "text-sm")}>
              Before you start
            </span>
            <ul className="grid gap-1 text-sm text-on-surface-variant">
              {validation.blockingReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {actionErrorMessage ? (
          <p className="text-sm text-error">{actionErrorMessage}</p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button
            type="button"
            disabled={!validation.isReady}
            isLoading={isStarting}
            onClick={() => void handleStart()}
          >
            Start Viva Session
          </Button>
          <Button type="button" variant="secondary" onClick={resetForm}>
            Cancel
          </Button>
        </div>
      </div>
    </section>
  );
}
