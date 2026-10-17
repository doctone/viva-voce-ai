import { formatDuration } from "./talkTime";
import {
  currentContent,
  type VivaRecordAmendment,
  type SignedVivaRecord,
} from "./vivaRecordAmendment";
import {
  formatVivaConclusionLabel,
  VIVA_CONCLUSIONS,
  type VivaConclusion,
  type VivaRecord,
} from "./vivaRecord";
import type { EvidenceMarkerType } from "./vivaSessionCapture";

/** A typical viva (about 12 questions) must fit one A4 sheet. */
export const SINGLE_PAGE_QUESTION_LIMIT = 12;
/** Page one carries the summary, evidence and conclusion, so holds fewer rows. */
export const FIRST_PAGE_QUESTION_LIMIT = 8;
/** Continuation pages carry only the repeated header, so hold more rows. */
export const CONTINUATION_PAGE_QUESTION_LIMIT = 16;

export const RECORD_EVIDENCE_LABELS: Record<EvidenceMarkerType, string> = {
  clear_understanding: "Clear understanding",
  concern: "Concern",
  needs_further_probing: "Probe further",
};

export type RecordPageQuestion = {
  id: string;
  isUnplanned: boolean;
  marker: string | null;
  number: number;
  observation: string | null;
  questionText: string;
};

export type RecordPageModel = {
  amended: { at: string; version: number } | null;
  conclusion: {
    explanation: string;
    followUpAction: string;
    options: ReadonlyArray<{
      label: string;
      selected: boolean;
      value: VivaConclusion;
    }>;
  };
  evidence: ReadonlyArray<{ count: number; label: string; type: EvidenceMarkerType }>;
  questions: readonly RecordPageQuestion[];
  signed: { at: string; by: string };
  student: string;
  summary: {
    duration: string;
    observations: number;
    questionsAsked: string;
    recording: string;
  };
  talkTimeSharePercent: number | null;
  title: string;
};

export type RecordPageContext = {
  amendments?: readonly VivaRecordAmendment[];
  studentName: string;
  submissionTitle: string;
  /** Left out of the page when null: missing speaker data is not zero. */
  talkTimeSharePercent?: number | null;
};

function describeQuestionCount(planned: number, followUps: number): string {
  if (followUps === 0) return `${planned}`;

  return `${planned} + ${followUps} follow-up${followUps === 1 ? "" : "s"}`;
}

/** Everything on the page, taken from the signed record and nothing else. */
export function buildRecordPageModel(
  record: SignedVivaRecord,
  context: RecordPageContext,
): RecordPageModel {
  const { snapshot } = record;
  const amendments = context.amendments ?? [];
  const content = currentContent(record, amendments);
  const asked = snapshot.askedQuestions;
  const followUps = asked.filter((q) => q.isUnplanned).length;
  const latestAmendment = [...amendments].sort((a, b) => b.version - a.version)[0];
  const startedMs = Date.parse(snapshot.session.startedAt);
  const endedMs = Date.parse(snapshot.session.endedAt);

  return {
    amended: latestAmendment
      ? { at: latestAmendment.createdAt, version: latestAmendment.version }
      : null,
    conclusion: {
      explanation: content.conclusionRationale,
      followUpAction: content.followUpAction,
      options: VIVA_CONCLUSIONS.map((value) => ({
        label: formatVivaConclusionLabel(value),
        selected: value === content.conclusion,
        value,
      })),
    },
    evidence: (
      ["clear_understanding", "needs_further_probing", "concern"] as const
    ).map((type) => ({
      count: asked.filter((q) => q.evidenceMarker?.markerType === type).length,
      label: RECORD_EVIDENCE_LABELS[type],
      type,
    })),
    questions: asked.map((q, index) => ({
      id: q.id,
      isUnplanned: q.isUnplanned,
      marker: q.evidenceMarker
        ? RECORD_EVIDENCE_LABELS[q.evidenceMarker.markerType]
        : null,
      number: index + 1,
      observation: q.observation?.content ?? null,
      questionText: q.questionText,
    })),
    signed: { at: record.signedAt, by: snapshot.teacher.name },
    student: context.studentName,
    summary: {
      duration: formatDuration(Math.max(0, endedMs - startedMs)),
      observations: asked.filter((q) => q.observation).length,
      questionsAsked: describeQuestionCount(asked.length - followUps, followUps),
      recording: snapshot.recording ? "Attached" : "Not attached",
    },
    talkTimeSharePercent: context.talkTimeSharePercent ?? null,
    title: context.submissionTitle,
  };
}

/**
 * How many questions go on each A4 sheet. A typical viva stays on one sheet;
 * a longer one overflows, and the last sheet always has room for the
 * signature block.
 */
export function paginateQuestionCounts(total: number): number[] {
  if (total <= SINGLE_PAGE_QUESTION_LIMIT) return [total];

  const pages = [FIRST_PAGE_QUESTION_LIMIT];
  let remaining = total - FIRST_PAGE_QUESTION_LIMIT;

  while (remaining > SINGLE_PAGE_QUESTION_LIMIT) {
    const take = Math.min(CONTINUATION_PAGE_QUESTION_LIMIT, remaining - 1);

    pages.push(take);
    remaining -= take;
  }

  pages.push(remaining);

  return pages;
}

export function paginateQuestions(
  questions: readonly RecordPageQuestion[],
): RecordPageQuestion[][] {
  let offset = 0;

  return paginateQuestionCounts(questions.length).map((count) => {
    const page = questions.slice(offset, offset + count);

    offset += count;

    return page;
  });
}

export function isSignedRecord(
  record: VivaRecord | null,
): record is SignedVivaRecord {
  return record?.status === "signed";
}
