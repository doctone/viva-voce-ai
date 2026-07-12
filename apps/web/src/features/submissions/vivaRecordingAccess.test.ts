import { describe, expect, it } from "vitest";
import {
  resolveVivaRecordingAccess,
  type SignedUrlOutcome,
  type VivaRecordingAccessRepository,
} from "./vivaRecordingAccess";

function repositoryReturning(
  outcome: SignedUrlOutcome,
): VivaRecordingAccessRepository {
  return {
    createSignedUrl: async () => outcome,
  };
}

describe("resolveVivaRecordingAccess", () => {
  it("allows playback with a signed URL when the request succeeds", async () => {
    const repository = repositoryReturning({
      errorMessage: null,
      signedUrl:
        "https://example-project.supabase.co/storage/v1/object/sign/submission-viva-audio/path.webm?token=abc",
    });

    const result = await resolveVivaRecordingAccess(
      "30420000-0000-0000-0000-000000000000/path.webm",
      repository,
    );

    expect(result).toEqual({
      status: "allowed",
      signedUrl:
        "https://example-project.supabase.co/storage/v1/object/sign/submission-viva-audio/path.webm?token=abc",
    });
  });

  it("passes the requested expiry through to the repository", async () => {
    let requestedExpiry: number | null = null;

    const repository: VivaRecordingAccessRepository = {
      createSignedUrl: async (_path, expiresInSeconds) => {
        requestedExpiry = expiresInSeconds;
        return { errorMessage: null, signedUrl: "https://example.com/signed" };
      },
    };

    await resolveVivaRecordingAccess("path.webm", repository);

    expect(requestedExpiry).toBe(60 * 60);
  });

  it("denies access when the request is rejected without a specific status", async () => {
    const repository = repositoryReturning({
      errorMessage: "Permission denied",
      errorStatus: 403,
      signedUrl: null,
    });

    const result = await resolveVivaRecordingAccess("path.webm", repository);

    expect(result).toEqual({ status: "denied" });
  });

  it("reports an expired session when the request fails with a 401", async () => {
    const repository = repositoryReturning({
      errorMessage: "JWT expired",
      errorStatus: 401,
      signedUrl: null,
    });

    const result = await resolveVivaRecordingAccess("path.webm", repository);

    expect(result).toEqual({ status: "expired" });
  });

  it("reports a missing recording when the object cannot be found", async () => {
    const repository = repositoryReturning({
      errorMessage: "Object not found",
      errorStatus: 404,
      signedUrl: null,
    });

    const result = await resolveVivaRecordingAccess("path.webm", repository);

    expect(result).toEqual({ status: "missing" });
  });

  it("falls back to message-based classification when no status is present", async () => {
    const missing = await resolveVivaRecordingAccess(
      "path.webm",
      repositoryReturning({
        errorMessage: "The resource was not found",
        signedUrl: null,
      }),
    );
    const expired = await resolveVivaRecordingAccess(
      "path.webm",
      repositoryReturning({ errorMessage: "invalid JWT", signedUrl: null }),
    );

    expect(missing).toEqual({ status: "missing" });
    expect(expired).toEqual({ status: "expired" });
  });

  it("denies access when no signed URL and no error are returned", async () => {
    const repository = repositoryReturning({
      errorMessage: null,
      signedUrl: null,
    });

    const result = await resolveVivaRecordingAccess("path.webm", repository);

    expect(result).toEqual({ status: "denied" });
  });
});
