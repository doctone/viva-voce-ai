import * as React from "react";
import { Button } from "../../../components/ui/Button";
import { cn } from "~/lib/utils";
import {
  eyebrowClassName,
  mutedTextClassName,
  paperPanelClassName,
} from "~/lib/class-names";
import {
  EVIDENCE_MARKER_TYPES,
  filterUnaskedPlannedQuestions,
  formatEvidenceMarkerLabel,
  type EvidenceMarkerType,
} from "../../../features/submissions/vivaSessionCapture";

const AUTOSAVE_DELAY_MS = 500;

export type CaptureEvidenceMarker = {
  markerType: EvidenceMarkerType;
};

export type CaptureObservation = {
  content: string;
};

export type CaptureAskedQuestion = {
  evidenceMarker: CaptureEvidenceMarker | null;
  id: string;
  isUnplanned: boolean;
  observation: CaptureObservation | null;
  questionText: string;
  vivaQuestionId: string | null;
};

export type CapturePlannedQuestion = {
  id: string;
  questionText: string;
};

type AskedQuestionCaptureCardProps = {
  askedQuestion: CaptureAskedQuestion;
  onApplyEvidenceMarker: (markerType: EvidenceMarkerType) => Promise<void>;
  onSaveObservation: (content: string) => Promise<void>;
};

type SaveStatus = "error" | "idle" | "saved" | "saving";

function AskedQuestionCaptureCard({
  askedQuestion,
  onApplyEvidenceMarker,
  onSaveObservation,
}: AskedQuestionCaptureCardProps) {
  const [content, setContent] = React.useState(
    askedQuestion.observation?.content ?? "",
  );
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("idle");
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [pendingMarker, setPendingMarker] =
    React.useState<EvidenceMarkerType | null>(null);
  const [markerErrorMessage, setMarkerErrorMessage] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const persistObservation = React.useCallback(
    async (value: string) => {
      setSaveStatus("saving");

      try {
        await onSaveObservation(value);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    },
    [onSaveObservation],
  );

  function handleContentChange(value: string) {
    setContent(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void persistObservation(value);
    }, AUTOSAVE_DELAY_MS);
  }

  function handleRetry() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    void persistObservation(content);
  }

  async function handleApplyMarker(markerType: EvidenceMarkerType) {
    setPendingMarker(markerType);
    setMarkerErrorMessage(null);

    try {
      await onApplyEvidenceMarker(markerType);
    } catch (error) {
      setMarkerErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not save the Evidence Marker.",
      );
    } finally {
      setPendingMarker(null);
    }
  }

  const observationFieldId = `observation-${askedQuestion.id}`;

  return (
    <div className="grid gap-4 border border-outline-variant bg-surface-container-lowest p-4">
      <div className="grid gap-1">
        <span className={eyebrowClassName}>
          {askedQuestion.isUnplanned ? "Unplanned follow-up" : "Asked question"}
        </span>
        <p className="text-sm leading-6 text-on-surface">
          {askedQuestion.questionText}
        </p>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-bold text-on-surface">
          Evidence marker
        </legend>
        <div className="flex flex-wrap gap-2">
          {EVIDENCE_MARKER_TYPES.map((markerType) => (
            <Button
              key={markerType}
              type="button"
              variant={
                askedQuestion.evidenceMarker?.markerType === markerType
                  ? "primary"
                  : "secondary"
              }
              aria-pressed={askedQuestion.evidenceMarker?.markerType === markerType}
              isLoading={pendingMarker === markerType}
              onClick={() => void handleApplyMarker(markerType)}
            >
              {formatEvidenceMarkerLabel(markerType)}
            </Button>
          ))}
        </div>
        {markerErrorMessage ? (
          <p className="text-sm text-error">{markerErrorMessage}</p>
        ) : null}
      </fieldset>

      <label className="grid gap-1 text-sm" htmlFor={observationFieldId}>
        Observation
        <textarea
          id={observationFieldId}
          rows={3}
          value={content}
          onChange={(event) => handleContentChange(event.target.value)}
          className="border border-outline-variant bg-surface-container-lowest p-2"
        />
      </label>

      <div className="flex items-center gap-3 text-sm" role="status">
        {saveStatus === "saving" ? (
          <span className={mutedTextClassName}>Saving…</span>
        ) : null}
        {saveStatus === "saved" ? (
          <span className={mutedTextClassName}>Saved</span>
        ) : null}
        {saveStatus === "error" ? (
          <>
            <span className="text-error">
              We couldn&apos;t save your Observation.
            </span>
            <Button type="button" variant="secondary" onClick={handleRetry}>
              Retry
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

type VivaSessionCapturePanelProps = {
  askedQuestions: CaptureAskedQuestion[];
  onApplyEvidenceMarker: (
    askedQuestionId: string,
    markerType: EvidenceMarkerType,
  ) => Promise<void>;
  onAskFollowUpQuestion: (questionText: string) => Promise<void>;
  onAskPlannedQuestion: (plannedQuestionId: string) => Promise<void>;
  onSaveObservation: (askedQuestionId: string, content: string) => Promise<void>;
  plannedQuestions: CapturePlannedQuestion[];
};

export function VivaSessionCapturePanel({
  askedQuestions,
  onApplyEvidenceMarker,
  onAskFollowUpQuestion,
  onAskPlannedQuestion,
  onSaveObservation,
  plannedQuestions,
}: VivaSessionCapturePanelProps) {
  const [selectedAskedQuestionId, setSelectedAskedQuestionId] = React.useState<
    string | null
  >(askedQuestions.at(-1)?.id ?? null);
  const [followUpText, setFollowUpText] = React.useState("");
  const [isAskingFollowUp, setIsAskingFollowUp] = React.useState(false);
  const [isAskingPlannedId, setIsAskingPlannedId] = React.useState<
    string | null
  >(null);
  const [actionErrorMessage, setActionErrorMessage] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    if (
      askedQuestions.length === 0 ||
      askedQuestions.some((question) => question.id === selectedAskedQuestionId)
    ) {
      return;
    }

    setSelectedAskedQuestionId(askedQuestions.at(-1)?.id ?? null);
  }, [askedQuestions, selectedAskedQuestionId]);

  const unaskedPlannedQuestions = filterUnaskedPlannedQuestions(
    plannedQuestions,
    askedQuestions.map((question) => ({
      vivaQuestionId: question.vivaQuestionId,
    })),
  );

  const selectedAskedQuestion =
    askedQuestions.find((question) => question.id === selectedAskedQuestionId) ??
    null;

  async function handleAskPlanned(question: CapturePlannedQuestion) {
    setIsAskingPlannedId(question.id);
    setActionErrorMessage(null);

    try {
      await onAskPlannedQuestion(question.id);
    } catch (error) {
      setActionErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not record that question as asked.",
      );
    } finally {
      setIsAskingPlannedId(null);
    }
  }

  async function handleAskFollowUp() {
    const questionText = followUpText.trim();

    if (questionText.length === 0) {
      return;
    }

    setIsAskingFollowUp(true);
    setActionErrorMessage(null);

    try {
      await onAskFollowUpQuestion(questionText);
      setFollowUpText("");
    } catch (error) {
      setActionErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not record that follow-up question.",
      );
    } finally {
      setIsAskingFollowUp(false);
    }
  }

  return (
    <section className={cn(paperPanelClassName, "bg-surface-container-low p-8")}>
      <div className="grid gap-5">
        <div className="grid gap-2">
          <span className={eyebrowClassName}>Viva Session</span>
          <h2 className="font-display text-[28px] font-medium leading-[1.3] tracking-[-0.01em] text-primary">
            Observations and Evidence
          </h2>
          <p className={cn(mutedTextClassName, "text-sm leading-6")}>
            Record what you ask, then capture private Observations and
            Evidence Markers against it.
          </p>
        </div>

        {unaskedPlannedQuestions.length > 0 ? (
          <div className="grid gap-2">
            <span className="text-sm font-bold text-on-surface">
              Planned questions
            </span>
            <ul className="grid gap-2">
              {unaskedPlannedQuestions.map((question) => (
                <li
                  key={question.id}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-sm text-on-surface-variant">
                    {question.questionText}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    isLoading={isAskingPlannedId === question.id}
                    onClick={() => void handleAskPlanned(question)}
                  >
                    Mark as asked
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-2">
          <label className="grid gap-1 text-sm" htmlFor="followUpQuestionText">
            Unplanned follow-up question
            <input
              id="followUpQuestionText"
              type="text"
              value={followUpText}
              onChange={(event) => setFollowUpText(event.target.value)}
              className="border border-outline-variant bg-surface-container-lowest p-2"
            />
          </label>
          <div>
            <Button
              type="button"
              variant="secondary"
              isLoading={isAskingFollowUp}
              disabled={followUpText.trim().length === 0}
              onClick={() => void handleAskFollowUp()}
            >
              Record follow-up as asked
            </Button>
          </div>
        </div>

        {actionErrorMessage ? (
          <p className="text-sm text-error">{actionErrorMessage}</p>
        ) : null}

        {askedQuestions.length === 0 ? (
          <p className={cn(mutedTextClassName, "text-sm leading-6")}>
            No questions have been asked yet.
          </p>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <span className="text-sm font-bold text-on-surface">
                Asked questions
              </span>
              <ul className="grid gap-2">
                {askedQuestions.map((question) => (
                  <li key={question.id}>
                    <button
                      type="button"
                      aria-pressed={question.id === selectedAskedQuestionId}
                      onClick={() => setSelectedAskedQuestionId(question.id)}
                      className={cn(
                        "w-full border border-outline-variant p-2 text-left text-sm",
                        question.id === selectedAskedQuestionId
                          ? "bg-primary-container"
                          : "bg-surface-container-lowest",
                      )}
                    >
                      {question.questionText}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {selectedAskedQuestion ? (
              <AskedQuestionCaptureCard
                key={selectedAskedQuestion.id}
                askedQuestion={selectedAskedQuestion}
                onApplyEvidenceMarker={(markerType) =>
                  onApplyEvidenceMarker(selectedAskedQuestion.id, markerType)
                }
                onSaveObservation={(content) =>
                  onSaveObservation(selectedAskedQuestion.id, content)
                }
              />
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
