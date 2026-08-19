import type { ReactNode } from "react";
import { Button } from "../../../components/ui";
import { cn } from "~/lib/utils";
import {
  eyebrowClassName,
  mutedTextClassName,
  paperPanelClassName,
} from "~/lib/class-names";

type RecordVivaPanelProps = {
  footer?: ReactNode;
  onRecord?: () => void;
  questionCount: number;
};

export function RecordVivaPanel({
  footer,
  onRecord,
  questionCount,
}: RecordVivaPanelProps) {
  return (
    <section
      aria-labelledby="record-viva-heading"
      className={cn(paperPanelClassName, "grid")}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-outline-variant px-8 py-4">
        <h2 className={eyebrowClassName} id="record-viva-heading">
          Viva recording
        </h2>
        <span className={cn(mutedTextClassName, "text-sm")}>
          {questionCount} {questionCount === 1 ? "question" : "questions"} to ask
        </span>
      </div>

      <div className="grid justify-items-center gap-6 px-8 py-10">
        <p
          aria-hidden="true"
          className="font-display text-[44px] font-medium leading-none tracking-[-0.02em] tabular-nums text-primary"
        >
          00:00:00
        </p>

        <Button
          aria-label="Record viva"
          className="gap-3 px-7"
          onClick={onRecord}
          size="lg"
          type="button"
        >
          <span
            aria-hidden="true"
            className="size-[10px] shrink-0 rounded-full bg-error"
          />
          Start Recording
        </Button>

        <p className={cn(mutedTextClassName, "max-w-[46ch] text-center text-sm leading-6")}>
          Confirm the student consents to being recorded before you start. The
          recording is stored against this submission as assessment evidence.
        </p>
      </div>

      {footer ? (
        <div className="grid gap-4 border-t border-outline-variant px-8 py-5">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
