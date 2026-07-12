import * as React from "react";
import { Button } from "../../../components/ui/Button";
import { cn } from "~/lib/utils";
import {
  eyebrowClassName,
  mutedTextClassName,
  paperPanelClassName,
} from "~/lib/class-names";
import {
  formatQuestionCategory,
  VIVA_QUESTION_CATEGORIES,
  type QuestionSetStatus,
} from "../../../features/submissions/vivaQuestionSet";

export type QuestionSetPanelQuestion = {
  category: string;
  id: string;
  label: string;
  questionText: string;
};

type QuestionSetPanelProps = {
  categoryBalance: Record<string, number>;
  estimatedDurationMinutes: number;
  onMarkReady: () => Promise<void>;
  onMoveQuestionDown: (questionId: string) => Promise<void>;
  onMoveQuestionUp: (questionId: string) => Promise<void>;
  onRemoveQuestion: (questionId: string) => Promise<void>;
  onRevertToDraft: () => Promise<void>;
  questions: QuestionSetPanelQuestion[];
  status: QuestionSetStatus;
};

function StatusBadge({ status }: { status: QuestionSetStatus }) {
  const isReady = status === "ready";

  return (
    <span
      className={cn(
        "inline-flex h-fit items-center px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
        isReady
          ? "bg-tertiary-container text-on-tertiary"
          : "bg-surface-container text-on-surface-variant",
      )}
    >
      {isReady ? "Ready for Viva" : "Draft"}
    </span>
  );
}

export function QuestionSetPanel({
  categoryBalance,
  estimatedDurationMinutes,
  onMarkReady,
  onMoveQuestionDown,
  onMoveQuestionUp,
  onRemoveQuestion,
  onRevertToDraft,
  questions,
  status,
}: QuestionSetPanelProps) {
  const [pendingQuestionId, setPendingQuestionId] = React.useState<
    string | null
  >(null);
  const [isChangingStatus, setIsChangingStatus] = React.useState(false);
  const [actionErrorMessage, setActionErrorMessage] = React.useState<
    string | null
  >(null);

  async function runQuestionAction(
    questionId: string,
    action: (questionId: string) => Promise<void>,
    fallbackMessage: string,
  ) {
    setPendingQuestionId(questionId);
    setActionErrorMessage(null);

    try {
      await action(questionId);
    } catch (error) {
      setActionErrorMessage(
        error instanceof Error ? error.message : fallbackMessage,
      );
    } finally {
      setPendingQuestionId(null);
    }
  }

  async function runStatusAction(
    action: () => Promise<void>,
    fallbackMessage: string,
  ) {
    setIsChangingStatus(true);
    setActionErrorMessage(null);

    try {
      await action();
    } catch (error) {
      setActionErrorMessage(
        error instanceof Error ? error.message : fallbackMessage,
      );
    } finally {
      setIsChangingStatus(false);
    }
  }

  return (
    <section className={cn(paperPanelClassName, "bg-surface-container-low p-8")}>
      <div className="grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-2">
            <span className={eyebrowClassName}>Viva Question Set</span>
            <h2 className="font-display text-[28px] font-medium leading-[1.3] tracking-[-0.01em] text-primary">
              {questions.length === 0
                ? "Build your Viva Question Set"
                : "Your Viva Question Set"}
            </h2>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="grid gap-3 border-t border-outline-variant pt-4 text-sm">
          <div className="flex items-center justify-between">
            <span className={mutedTextClassName}>Estimated duration</span>
            <span className="font-bold text-on-surface [font-variant-numeric:tabular-nums]">
              {estimatedDurationMinutes} min
            </span>
          </div>
          <div className="grid gap-1">
            <span className={mutedTextClassName}>Category balance</span>
            <ul className="grid gap-1">
              {VIVA_QUESTION_CATEGORIES.map((category) => (
                <li
                  key={category}
                  className="flex items-center justify-between text-on-surface"
                >
                  <span>{formatQuestionCategory(category)}</span>
                  <span className="font-bold [font-variant-numeric:tabular-nums]">
                    {categoryBalance[category] ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {questions.length === 0 ? (
          <p className={cn(mutedTextClassName, "text-sm leading-6")}>
            No questions selected yet. Add questions from the list to build
            your Viva Question Set.
          </p>
        ) : (
          <ol className="grid gap-3">
            {questions.map((question, index) => {
              const isPending = pendingQuestionId === question.id;

              return (
                <li
                  key={question.id}
                  className="grid gap-2 border border-outline-variant bg-surface-container-lowest p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                        {index + 1}. {question.label}
                      </span>
                      <p className="text-sm leading-6 text-on-surface">
                        {question.questionText}
                      </p>
                    </div>
                    <div className="grid shrink-0 gap-1">
                      <button
                        type="button"
                        aria-label={`Move question up: ${question.questionText}`}
                        disabled={index === 0 || isPending}
                        className="text-sm text-on-surface-variant transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() =>
                          runQuestionAction(
                            question.id,
                            onMoveQuestionUp,
                            "We could not reorder the viva question set.",
                          )
                        }
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        aria-label={`Move question down: ${question.questionText}`}
                        disabled={
                          index === questions.length - 1 || isPending
                        }
                        className="text-sm text-on-surface-variant transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() =>
                          runQuestionAction(
                            question.id,
                            onMoveQuestionDown,
                            "We could not reorder the viva question set.",
                          )
                        }
                      >
                        Move down
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove question from set: ${question.questionText}`}
                        disabled={isPending}
                        className="text-sm text-on-surface-variant transition-colors hover:text-error disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() =>
                          runQuestionAction(
                            question.id,
                            onRemoveQuestion,
                            "We could not remove the question from the viva question set.",
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {actionErrorMessage ? (
          <p className="text-sm text-error">{actionErrorMessage}</p>
        ) : null}

        <div>
          {status === "ready" ? (
            <Button
              type="button"
              variant="secondary"
              isLoading={isChangingStatus}
              onClick={() =>
                runStatusAction(
                  onRevertToDraft,
                  "We could not revert the viva question set to draft.",
                )
              }
            >
              Revert set to draft
            </Button>
          ) : (
            <Button
              type="button"
              isLoading={isChangingStatus}
              disabled={questions.length === 0}
              onClick={() =>
                runStatusAction(
                  onMarkReady,
                  "We could not mark the viva question set ready.",
                )
              }
            >
              Mark set ready for viva
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
