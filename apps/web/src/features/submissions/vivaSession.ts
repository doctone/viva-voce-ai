import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestionSetStatus } from "./vivaQuestionSet";

export const CONSENT_STATES = ["consent_given", "recording_disabled"] as const;
export type ConsentState = (typeof CONSENT_STATES)[number];

export type EquipmentCheckResult = "passed" | "failed";
export type VivaSessionStatus = "active" | "ended";

export type ReadinessChecklist = {
  accessibilityAdjustments: string;
  consentDeclinedReason: string;
  consentState: ConsentState | null;
  equipmentCheckResult: EquipmentCheckResult | null;
  expectedDurationMinutes: number | null;
  questionSetStatus: QuestionSetStatus;
  studentConfirmed: boolean;
};

export type ReadinessValidation = {
  blockingReasons: string[];
  isReady: boolean;
};

export function evaluateReadiness(
  checklist: ReadinessChecklist,
): ReadinessValidation {
  const blockingReasons: string[] = [];

  if (checklist.questionSetStatus !== "ready") {
    blockingReasons.push(
      "Mark the Viva Question Set ready before starting a Viva Session.",
    );
  }

  if (!checklist.studentConfirmed) {
    blockingReasons.push(
      "Confirm the student and submission are correct.",
    );
  }

  if (checklist.consentState === null) {
    blockingReasons.push(
      "Record recording consent, or the reason recording is disabled.",
    );
  } else if (
    checklist.consentState === "recording_disabled" &&
    checklist.consentDeclinedReason.trim().length === 0
  ) {
    blockingReasons.push("Enter a reason recording is disabled.");
  }

  if (checklist.equipmentCheckResult !== "passed") {
    blockingReasons.push(
      "Run the microphone check and confirm it passes.",
    );
  }

  if (
    checklist.expectedDurationMinutes === null ||
    !Number.isFinite(checklist.expectedDurationMinutes) ||
    checklist.expectedDurationMinutes <= 0
  ) {
    blockingReasons.push("Enter an expected duration greater than zero.");
  }

  return { blockingReasons, isReady: blockingReasons.length === 0 };
}

export type VivaSessionRecord = {
  accessibilityAdjustments: string;
  consentDeclinedReason: string | null;
  consentState: ConsentState;
  equipmentCheckResult: EquipmentCheckResult;
  expectedDurationMinutes: number;
  id: string;
  startedAt: string;
  status: VivaSessionStatus;
  submissionId: string;
  vivaQuestionSetId: string;
};

export type StartVivaSessionInput = {
  accessibilityAdjustments: string;
  consentDeclinedReason: string | null;
  consentState: ConsentState;
  equipmentCheckResult: "passed";
  expectedDurationMinutes: number;
  submissionId: string;
  vivaQuestionSetId: string;
};

export type VivaSessionRepository = {
  endSession: (vivaSessionId: string) => Promise<void>;
  findActiveSession: (
    vivaQuestionSetId: string,
  ) => Promise<VivaSessionRecord | null>;
  insertSession: (
    input: StartVivaSessionInput,
  ) => Promise<VivaSessionRecord>;
};

export type StartVivaSessionResult =
  | { outcome: "already_active"; session: VivaSessionRecord }
  | { outcome: "started"; session: VivaSessionRecord };

/**
 * A Viva Session runs until the teacher ends the conversation, so stopping the
 * recording ends it. Leaving it active would make the next take reuse this
 * session, restart the chunk sequence at zero, and collide with audio already
 * in storage.
 */
export async function endVivaSession(
  vivaSessionId: string,
  repository: VivaSessionRepository,
): Promise<void> {
  await repository.endSession(vivaSessionId);
}

export async function startVivaSession(
  input: StartVivaSessionInput,
  repository: VivaSessionRepository,
): Promise<StartVivaSessionResult> {
  const existing = await repository.findActiveSession(
    input.vivaQuestionSetId,
  );

  if (existing) {
    return { outcome: "already_active", session: existing };
  }

  const session = await repository.insertSession(input);

  return { outcome: "started", session };
}

/**
 * Starts a take, ending any session left active first.
 *
 * A session is only ended by the teacher stopping, so a crash, a closed tab or
 * a lost connection strands one as active forever. The next take would then
 * reuse it and restart its chunk sequence at zero, colliding with audio already
 * in storage. Every take gets its own session.
 */
export async function startFreshVivaSession(
  input: StartVivaSessionInput,
  repository: VivaSessionRepository,
): Promise<VivaSessionRecord> {
  const stranded = await repository.findActiveSession(input.vivaQuestionSetId);

  if (stranded) {
    await repository.endSession(stranded.id);
  }

  return repository.insertSession(input);
}

type VivaSessionRow = {
  accessibility_adjustments: string;
  consent_declined_reason: string | null;
  consent_state: ConsentState;
  equipment_check_result: EquipmentCheckResult;
  expected_duration_minutes: number;
  id: string;
  started_at: string;
  status: VivaSessionStatus;
  submission_id: string;
  viva_question_set_id: string;
};

function mapRowToRecord(row: VivaSessionRow): VivaSessionRecord {
  return {
    accessibilityAdjustments: row.accessibility_adjustments,
    consentDeclinedReason: row.consent_declined_reason,
    consentState: row.consent_state,
    equipmentCheckResult: row.equipment_check_result,
    expectedDurationMinutes: row.expected_duration_minutes,
    id: row.id,
    startedAt: row.started_at,
    status: row.status,
    submissionId: row.submission_id,
    vivaQuestionSetId: row.viva_question_set_id,
  };
}

const VIVA_SESSION_COLUMNS =
  "id, submission_id, viva_question_set_id, status, consent_state, consent_declined_reason, equipment_check_result, expected_duration_minutes, accessibility_adjustments, started_at";

const UNIQUE_VIOLATION_CODE = "23505";

export function createSupabaseVivaSessionRepository(
  supabase: SupabaseClient,
): VivaSessionRepository {
  return {
    async endSession(vivaSessionId) {
      const { error } = await supabase
        .from("viva_sessions")
        .update({ ended_at: new Date().toISOString(), status: "ended" })
        .eq("id", vivaSessionId);

      if (error) {
        throw new Error("We could not end the Viva Session.");
      }
    },
    async findActiveSession(vivaQuestionSetId) {
      const { data, error } = await supabase
        .from("viva_sessions")
        .select(VIVA_SESSION_COLUMNS)
        .eq("viva_question_set_id", vivaQuestionSetId)
        .eq("status", "active");

      if (error) {
        throw new Error("We could not check for an active Viva Session.");
      }

      const row = (data as VivaSessionRow[] | null)?.[0];

      return row ? mapRowToRecord(row) : null;
    },
    async insertSession(input) {
      const { data, error } = await supabase
        .from("viva_sessions")
        .insert({
          accessibility_adjustments: input.accessibilityAdjustments,
          consent_declined_reason: input.consentDeclinedReason,
          consent_state: input.consentState,
          equipment_check_result: input.equipmentCheckResult,
          expected_duration_minutes: input.expectedDurationMinutes,
          submission_id: input.submissionId,
          viva_question_set_id: input.vivaQuestionSetId,
        })
        .select(VIVA_SESSION_COLUMNS);

      if (error) {
        if (error.code === UNIQUE_VIOLATION_CODE) {
          const { data: activeData, error: activeError } = await supabase
            .from("viva_sessions")
            .select(VIVA_SESSION_COLUMNS)
            .eq("viva_question_set_id", input.vivaQuestionSetId)
            .eq("status", "active");

          const activeRow = (activeData as VivaSessionRow[] | null)?.[0];

          if (!activeError && activeRow) {
            return mapRowToRecord(activeRow);
          }
        }

        throw new Error("We could not start the Viva Session.");
      }

      const row = (data as VivaSessionRow[] | null)?.[0];

      if (!row) {
        throw new Error("We could not start the Viva Session.");
      }

      return mapRowToRecord(row);
    },
  };
}

export type EquipmentCheckRepository = {
  checkMicrophone: () => Promise<EquipmentCheckResult>;
};

export function createBrowserEquipmentCheckRepository(): EquipmentCheckRepository {
  return {
    async checkMicrophone() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        stream.getTracks().forEach((track) => track.stop());

        return "passed";
      } catch {
        return "failed";
      }
    },
  };
}
