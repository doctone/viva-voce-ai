import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type VivaConclusion,
  type VivaRecord,
} from "./vivaRecord";

export type SignedVivaRecord = Extract<VivaRecord, { status: "signed" }>;

export const AMENDABLE_FIELDS = [
  "conclusion",
  "conclusionRationale",
  "followUpAction",
] as const;

export type AmendableField = (typeof AMENDABLE_FIELDS)[number];

export type FieldChange = {
  field: AmendableField;
  from: string;
  to: string;
};

export type VivaRecordAmendment = {
  authorId: string;
  authorName: string;
  changes: readonly FieldChange[];
  createdAt: string;
  id: string;
  reason: string;
  /** 1-based and consecutive per record. */
  version: number;
};

/** What an amendment leaves in force: the content of a record at one version. */
export type VivaRecordContent = {
  conclusion: VivaConclusion;
  conclusionRationale: string;
  followUpAction: string;
};

export type AmendmentInput = {
  conclusion: VivaConclusion | null;
  conclusionRationale: string;
  followUpAction: string;
  reason: string;
};

export function originalContent(record: SignedVivaRecord): VivaRecordContent {
  return {
    conclusion: record.conclusion,
    conclusionRationale: record.conclusionRationale,
    followUpAction: record.followUpAction,
  };
}

/** The record as it stands now: the original with every amendment applied in order. */
export function currentContent(
  record: SignedVivaRecord,
  amendments: readonly VivaRecordAmendment[],
): VivaRecordContent {
  const content: Record<AmendableField, string> = { ...originalContent(record) };

  for (const amendment of [...amendments].sort((a, b) => a.version - b.version)) {
    for (const change of amendment.changes) {
      content[change.field] = change.to;
    }
  }

  return {
    conclusion: content.conclusion as VivaConclusion,
    conclusionRationale: content.conclusionRationale,
    followUpAction: content.followUpAction,
  };
}

export function currentVersion(
  amendments: readonly VivaRecordAmendment[],
): number {
  return amendments.reduce((max, a) => Math.max(max, a.version), 0);
}

export function diffContent(
  before: VivaRecordContent,
  after: VivaRecordContent,
): FieldChange[] {
  return AMENDABLE_FIELDS.flatMap((field) =>
    before[field] === after[field]
      ? []
      : [{ field, from: before[field], to: after[field] }],
  );
}

export function validateAmendment(
  input: AmendmentInput,
  before: VivaRecordContent,
): string[] {
  const reasons: string[] = [];

  if (input.conclusion === null) {
    reasons.push("Choose a Viva Conclusion.");
  }

  if (input.conclusionRationale.trim().length === 0) {
    reasons.push("Explain your Viva Conclusion.");
  }

  if (input.reason.trim().length === 0) {
    reasons.push("Say why you are amending this record.");
  }

  if (
    reasons.length === 0 &&
    input.conclusion !== null &&
    diffContent(before, { ...input, conclusion: input.conclusion }).length === 0
  ) {
    reasons.push("Change at least one field before amending.");
  }

  return reasons;
}

export type VivaRecordAmendmentRepository = {
  /** Oldest first. */
  list: (recordId: string) => Promise<VivaRecordAmendment[]>;
  /**
   * Must append exactly `version` and fail with `AmendmentConflictError` if
   * another amendment has already taken it.
   */
  append: (
    recordId: string,
    amendment: {
      changes: readonly FieldChange[];
      content: VivaRecordContent;
      reason: string;
      version: number;
    },
  ) => Promise<VivaRecordAmendment>;
};

export class AmendmentConflictError extends Error {
  constructor() {
    super("This Viva Record was amended by someone else.");
  }
}

export type AmendResult =
  | { outcome: "amended"; amendment: VivaRecordAmendment }
  | { outcome: "conflict"; amendments: VivaRecordAmendment[] }
  | { outcome: "forbidden" }
  | { outcome: "rejected"; reasons: string[] };

/**
 * Only the signing teacher may amend, and only against the version they were
 * looking at (`expectedVersion`), so concurrent amendments never overwrite
 * each other silently.
 */
export async function amendVivaRecord(
  params: {
    actorId: string;
    expectedVersion: number;
    input: AmendmentInput;
    record: SignedVivaRecord;
  },
  repository: VivaRecordAmendmentRepository,
): Promise<AmendResult> {
  const { actorId, expectedVersion, input, record } = params;

  if (actorId !== record.snapshot.teacher.id) {
    return { outcome: "forbidden" };
  }

  const amendments = await repository.list(record.id);

  if (currentVersion(amendments) !== expectedVersion) {
    return { outcome: "conflict", amendments };
  }

  const before = currentContent(record, amendments);
  const reasons = validateAmendment(input, before);

  if (reasons.length > 0 || input.conclusion === null) {
    return { outcome: "rejected", reasons };
  }

  const content: VivaRecordContent = {
    conclusion: input.conclusion,
    conclusionRationale: input.conclusionRationale,
    followUpAction: input.followUpAction,
  };

  try {
    const amendment = await repository.append(record.id, {
      changes: diffContent(before, content),
      content,
      reason: input.reason.trim(),
      version: expectedVersion + 1,
    });

    return { outcome: "amended", amendment };
  } catch (error) {
    if (error instanceof AmendmentConflictError) {
      return { outcome: "conflict", amendments: await repository.list(record.id) };
    }

    throw error;
  }
}

type AmendmentRow = {
  author_id: string;
  changes: FieldChange[];
  created_at: string;
  id: string;
  reason: string;
  version: number;
};

const AMENDMENT_COLUMNS = "id, version, author_id, reason, changes, created_at";

export function createSupabaseVivaRecordAmendmentRepository(
  supabase: SupabaseClient,
  authorName: (authorId: string) => string = (id) => id,
): VivaRecordAmendmentRepository {
  const map = (row: AmendmentRow): VivaRecordAmendment => ({
    authorId: row.author_id,
    authorName: authorName(row.author_id),
    changes: row.changes,
    createdAt: row.created_at,
    id: row.id,
    reason: row.reason,
    version: row.version,
  });

  return {
    async list(recordId) {
      const { data, error } = await supabase
        .from("viva_record_amendments")
        .select(AMENDMENT_COLUMNS)
        .eq("viva_record_id", recordId)
        .order("version", { ascending: true });

      if (error) {
        throw new Error("We could not load the amendment history.");
      }

      return ((data ?? []) as AmendmentRow[]).map(map);
    },
    async append(recordId, amendment) {
      const { data, error } = await supabase
        .from("viva_record_amendments")
        .insert({
          changes: amendment.changes,
          conclusion: amendment.content.conclusion,
          conclusion_rationale: amendment.content.conclusionRationale,
          follow_up_action: amendment.content.followUpAction,
          reason: amendment.reason,
          version: amendment.version,
          viva_record_id: recordId,
        })
        .select(AMENDMENT_COLUMNS);

      // 40001 = serialization_failure (trigger), 23505 = duplicate version.
      if (error?.code === "40001" || error?.code === "23505") {
        throw new AmendmentConflictError();
      }

      const row = (data as AmendmentRow[] | null)?.[0];

      if (error || !row) {
        throw new Error("We could not amend the Viva Record.");
      }

      return map(row);
    },
  };
}

export function describeChangedField(field: AmendableField): string {
  switch (field) {
    case "conclusion":
      return "Viva Conclusion";
    case "conclusionRationale":
      return "Explanation";
    case "followUpAction":
      return "Follow-up action";
  }
}


