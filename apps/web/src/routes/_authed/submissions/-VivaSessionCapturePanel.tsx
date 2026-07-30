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

type SaveStatus = "error" | "idle" | "saved" | "saving" | "unsaved";

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

  // Holds the text a debounced save is still owed, so an unmount, a blur, or a
  // tab close can flush it. An Observation is assessment evidence: losing the
  // last edit silently is never acceptable.
  const pendingContentRef = React.useRef<string | null>(null);

  const persistObservation = React.useCallback(
    async (value: string) => {
      pendingContentRef.current = null;
      setSaveStatus("saving");

      try {
        await onSaveObservation(value);
        setSaveStatus("saved");
      } catch {
        pendingContentRef.current = value;
        setSaveStatus("error");
      }
    },
    [onSaveObservation],
  );

  const flushPendingObservation = React.useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const pending = pendingContentRef.current;

    if (pending === null) {
      return;
    }

    void persistObservation(pending);
  }, [persistObservation]);

  // Flush on unmount: switching to another Asked Question remounts this card.
  const flushRef = React.useRef(flushPendingObservation);
  flushRef.current = flushPendingObservation;

  React.useEffect(() => {
    return () => {
      flushRef.current();
    };
  }, []);

  React.useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (pendingContentRef.current === null) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  function handleContentChange(value: string) {
    setContent(value);
    pendingContentRef.current = value;
    setSaveStatus("unsaved");

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void persistObservation(value);
    }, AUTOSAVE_DELAY_MS);
  }

  function handleRetry() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
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
        Observation (private to you)
        <textarea
          id={observationFieldId}
          rows={3}
          value={content}
          onBlur={flushPendingObservation}
          onChange={(event) => handleContentChange(event.target.value)}
          className="border border-outline-variant bg-surface-container-lowest p-2"
        />
      </label>

      <div className="flex items-center gap-3 text-sm" role="status">
        {saveStatus === "unsaved" ? (
          <span className={mutedTextClassName}>Unsaved changes</span>
        ) : null}
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
  /** True while Asked Questions are still loading, so an empty list is not reported as "none asked". */
  isLoadingAskedQuestions?: boolean;
  /**
   * Conduct mode drives asking from its own single-question panel, so it hides
   * these controls rather than offering a second way to mark a question asked.
   */
  showAskControls?: boolean;
};

export function VivaSessionCapturePanel({
  askedQuestions,
  isLoadingAskedQuestions = false,
  onApplyEvidenceMarker,
  onAskFollowUpQuestion,
  onAskPlannedQuestion,
  onSaveObservation,
  plannedQuestions,
  showAskControls = true,
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
          <h2 className={subheadClassName}>Observations and Evidence</h2>
          <p className={cn(mutedTextClassName, "text-sm leading-6")}>
            Record what you ask, then capture private Observations and
            Evidence Markers against it.
          </p>
        </div>

        {showAskControls && unaskedPlannedQuestions.length > 0 ? (
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

        {showAskControls ? (
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
        ) : null}

        {actionErrorMessage ? (
          <p className="text-sm text-error">{actionErrorMessage}</p>
        ) : null}

        {askedQuestions.length === 0 ? (
          <p className={cn(mutedTextClassName, "text-sm leading-6")} role="status">
            {isLoadingAskedQuestions
              ? "Loading asked questions…"
              : "No questions have been asked yet."}
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
                        "w-full border p-2 text-left text-sm transition-colors",
                        question.id === selectedAskedQuestionId
                          ? "border-primary bg-surface-container font-medium text-on-surface"
                          : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-on-surface-variant",
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
