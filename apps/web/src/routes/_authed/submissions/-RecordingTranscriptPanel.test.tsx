import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RecordingTranscriptPanel } from "./-RecordingTranscriptPanel";
import type {
  RecordingTranscriptSegment,
  TranscriptionJob,
} from "../../../features/submissions/recordingTranscript";

const job = (overrides: Partial<TranscriptionJob> = {}): TranscriptionJob => ({
  attempts: 1,
  durationSeconds: 20,
  errorMessage: null,
  id: "job-1",
  status: "completed",
  ...overrides,
});

const segments: RecordingTranscriptSegment[] = [
  { confidence: 0.9, endSeconds: 5, startSeconds: 0, text: "Tell me about your method." },
  { confidence: 0.3, endSeconds: 12, startSeconds: 5, text: "Mumbled answer about sampling." },
  { confidence: 0.9, endSeconds: 20, startSeconds: 12, text: "Sampling was random." },
];

function renderPanel(props: Partial<React.ComponentProps<typeof RecordingTranscriptPanel>> = {}) {
  const onRetry = vi.fn();
  const onSeek = vi.fn();
  render(
    <RecordingTranscriptPanel
      currentSeconds={0}
      job={job()}
      onRetry={onRetry}
      onSeek={onSeek}
      segments={segments}
      {...props}
    />,
  );
  return { onRetry, onSeek };
}

describe("RecordingTranscriptPanel", () => {
  it.each([
    ["queued", "Transcript queued"],
    ["processing", "Transcribing…"],
  ] as const)("shows the %s state", (status, label) => {
    renderPanel({ job: job({ status }), segments: [] });
    expect(screen.getByRole("status")).toHaveTextContent(label);
  });

  it("shows a failure with retry and says review is unaffected", async () => {
    const { onRetry } = renderPanel({
      job: job({ errorMessage: "Provider is down.", status: "failed" }),
      segments: [],
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Provider is down.");
    expect(screen.getByRole("alert")).toHaveTextContent("still review and conclude");
    await userEvent.click(screen.getByRole("button", { name: "Retry transcript" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("seeks the recording when a segment is clicked", async () => {
    const { onSeek } = renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /Sampling was random/ }));
    expect(onSeek).toHaveBeenCalledWith(12);
  });

  it("marks the segment being played", () => {
    renderPanel({ currentSeconds: 6 });
    expect(screen.getByRole("button", { name: /Mumbled answer/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: /Tell me about/ })).not.toHaveAttribute("aria-current");
  });

  it("labels uncertain passages", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /Mumbled answer/ })).toHaveTextContent("(uncertain)");
    expect(screen.getByRole("button", { name: /Tell me about/ })).not.toHaveTextContent("(uncertain)");
  });

  it("highlights search matches and counts them", async () => {
    renderPanel();
    await userEvent.type(screen.getByLabelText("Search transcript"), "sampling");

    expect(screen.getByText("2 matches")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mumbled answer/ })).toHaveAttribute("data-match", "true");
    expect(screen.getByRole("button", { name: /Tell me about/ })).not.toHaveAttribute("data-match");
  });

  it("shows recording-quality warnings", () => {
    renderPanel({ job: job({ durationSeconds: 200 }) });
    expect(screen.getAllByRole("alert").map((a) => a.textContent).join(" ")).toMatch(/silent or inaudible/);
  });

  it("says when no speech was detected", () => {
    renderPanel({ segments: [] });
    expect(screen.getByRole("alert")).toHaveTextContent("No speech was detected");
  });
});
