import type { SupabaseClient } from "@supabase/supabase-js";

export const VIVA_RECORDING_BUCKET = "submission-viva-audio";
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

export type VivaRecordingAccessResult =
  | { status: "allowed"; signedUrl: string }
  | { status: "denied" }
  | { status: "expired" }
  | { status: "missing" };

export type SignedUrlOutcome = {
  errorMessage: string | null;
  errorStatus?: number;
  signedUrl: string | null;
};

export type VivaRecordingAccessRepository = {
  createSignedUrl: (
    path: string,
    expiresInSeconds: number,
  ) => Promise<SignedUrlOutcome>;
};

function classifyFailure(
  outcome: SignedUrlOutcome,
): Exclude<VivaRecordingAccessResult, { status: "allowed" }>["status"] {
  if (outcome.errorStatus === 401) {
    return "expired";
  }

  if (outcome.errorStatus === 404) {
    return "missing";
  }

  const message = outcome.errorMessage?.toLowerCase() ?? "";

  if (message.includes("not found") || message.includes("not_found")) {
    return "missing";
  }

  if (message.includes("jwt")) {
    return "expired";
  }

  return "denied";
}

export async function resolveVivaRecordingAccess(
  path: string,
  repository: VivaRecordingAccessRepository,
  expiresInSeconds: number = SIGNED_URL_EXPIRY_SECONDS,
): Promise<VivaRecordingAccessResult> {
  const outcome = await repository.createSignedUrl(path, expiresInSeconds);

  if (outcome.signedUrl) {
    return { status: "allowed", signedUrl: outcome.signedUrl };
  }

  return { status: classifyFailure(outcome) };
}

export function createSupabaseVivaRecordingAccessRepository(
  supabase: SupabaseClient,
): VivaRecordingAccessRepository {
  return {
    async createSignedUrl(path, expiresInSeconds) {
      const { data, error } = await supabase.storage
        .from(VIVA_RECORDING_BUCKET)
        .createSignedUrl(path, expiresInSeconds);

      return {
        errorMessage: error?.message ?? null,
        errorStatus: error?.status,
        signedUrl: data?.signedUrl ?? null,
      };
    },
  };
}
