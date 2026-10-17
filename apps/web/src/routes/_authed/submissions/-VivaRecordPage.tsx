import { Button } from "../../../components/ui/Button";
import {
  paginateQuestions,
  type RecordPageModel,
  type RecordPageQuestion,
} from "../../../features/submissions/vivaRecordPage";

export type VivaRecordPageProps =
  | { model: RecordPageModel; state: "signed" }
  | { state: "unsigned" };

const labelClassName =
  "text-[11px] font-bold uppercase tracking-[0.08em] text-[#44474e]";
const sectionHeadingClassName = `${labelClassName} mb-1`;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function VivaRecordPage(props: VivaRecordPageProps) {
  if (props.state === "unsigned") {
    return (
      <section
        aria-labelledby="record-unsigned-heading"
        className="grid max-w-prose gap-2 p-6"
      >
        <h1 className="text-xl font-bold" id="record-unsigned-heading">
          Not yet signed
        </h1>
        <p className="text-sm leading-6">
          There is no Viva Record to present until the teacher signs it. Sign
          the record from Conduct mode and it will appear here as a single A4
          page.
        </p>
      </section>
    );
  }

  const { model } = props;
  const pages = paginateQuestions(model.questions);
  const heading = `${model.student} — ${model.title}`;

  return (
    <div className="record-root grid justify-center gap-6">
      <div className="record-no-print flex flex-wrap items-center gap-3">
        <Button onClick={() => window.print()}>Download PDF</Button>
        <span className="text-sm text-on-surface-variant">
          Opens the print dialog; choose “Save as PDF” for a text PDF with the
          same layout.
        </span>
      </div>
      {pages.map((questions, index) => {
        const isFirst = index === 0;
        const isLast = index === pages.length - 1;

        return (
          <article
            aria-label={`Viva record, page ${index + 1} of ${pages.length}`}
            className="record-sheet grid content-start gap-4 border border-outline-variant text-[13px] leading-5 shadow-technical"
            key={index}
          >
            <header className="grid gap-1 border-b border-[#1a1c1a] pb-3">
              <span className={labelClassName}>Viva record</span>
              {isFirst ? (
                <h1 className="text-xl font-bold leading-6">{heading}</h1>
              ) : (
                <p className="text-xl font-bold leading-6">{heading}</p>
              )}
              {!isFirst ? (
                <span className="text-xs">
                  Continued, page {index + 1} of {pages.length}
                </span>
              ) : pages.length > 1 ? (
                <span className="text-xs">
                  Page 1 of {pages.length}; continues overleaf
                </span>
              ) : null}
            </header>

            {isFirst ? <FirstPageSections model={model} /> : null}

            <section aria-label="Asked questions">
              <h2 className={sectionHeadingClassName}>Asked questions</h2>
              <ol className="grid gap-1.5">
                {questions.map((question) => (
                  <QuestionRow key={question.id} question={question} />
                ))}
              </ol>
            </section>

            {isLast ? <SignatureBlock model={model} /> : null}
          </article>
        );
      })}
    </div>
  );
}

function FirstPageSections({ model }: { model: RecordPageModel }) {
  return (
    <>
      <dl
        aria-label="Summary"
        className="grid grid-cols-4 gap-3 border-b border-outline-variant pb-3"
      >
        <SummaryField label="Duration" value={model.summary.duration} />
        <SummaryField
          label="Questions asked"
          value={model.summary.questionsAsked}
        />
        <SummaryField
          label="Observations"
          value={String(model.summary.observations)}
        />
        <SummaryField label="Recording" value={model.summary.recording} />
      </dl>

      <section aria-label="Evidence" className="flex flex-wrap gap-x-6 gap-y-1">
        <h2 className={`${sectionHeadingClassName} w-full`}>Evidence</h2>
        {model.evidence.map((item) => (
          <span key={item.type}>
            {item.label}: <strong>{item.count}</strong>
          </span>
        ))}
        {model.talkTimeSharePercent !== null ? (
          <span>
            Talk time, student share:{" "}
            <strong>{model.talkTimeSharePercent}%</strong>
          </span>
        ) : null}
      </section>

      <section aria-label="Viva Conclusion">
        <h2 className={sectionHeadingClassName}>Viva Conclusion</h2>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
          {model.conclusion.options.map((option) => (
            <li
              className={option.selected ? "font-bold" : undefined}
              key={option.value}
            >
              <span aria-hidden="true">{option.selected ? "☒" : "☐"} </span>
              {option.label}
              <span className="sr-only">
                {option.selected ? " (selected)" : " (not selected)"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2">
          <strong>Explanation:</strong> {model.conclusion.explanation}
        </p>
        {model.conclusion.followUpAction ? (
          <p>
            <strong>Follow-up action:</strong> {model.conclusion.followUpAction}
          </p>
        ) : null}
      </section>
    </>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className={labelClassName}>{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}

function QuestionRow({ question }: { question: RecordPageQuestion }) {
  return (
    <li className="break-inside-avoid border-b border-outline-variant pb-1.5">
      <p className="font-bold">
        {question.number}. {question.questionText}
        {question.isUnplanned ? " (follow-up)" : ""}
      </p>
      {question.marker || question.observation ? (
        <p className="line-clamp-2">
          {question.marker ? <strong>{question.marker}</strong> : null}
          {question.marker && question.observation ? " — " : null}
          {question.observation}
        </p>
      ) : null}
    </li>
  );
}

function SignatureBlock({ model }: { model: RecordPageModel }) {
  return (
    <footer
      aria-label="Signature"
      className="mt-auto grid grid-cols-[1fr_auto] items-end gap-4 border-t border-[#1a1c1a] pt-3"
    >
      <div>
        <p className={labelClassName}>Signed by</p>
        <p className="font-bold">{model.signed.by}</p>
        <p>{formatDateTime(model.signed.at)}</p>
        {model.amended ? (
          <p>
            Amended {formatDateTime(model.amended.at)} (version{" "}
            {model.amended.version})
          </p>
        ) : null}
      </div>
      <p className="rounded-[var(--radius)] border-2 border-[#1a1c1a] px-3 py-1 font-bold uppercase tracking-[0.08em]">
        {model.amended ? "Signed record · Amended" : "Signed record"}
      </p>
    </footer>
  );
}
