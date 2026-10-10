import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LabelledTranscript } from "./-LabelledTranscript";
import type { StoredUtterance } from "../../../features/submissions/transcriptUtterances";

const utterances: StoredUtterance[] = [
  { endMs: 5_000, id: "u1", speaker: "teacher", speakerSource: "model", startMs: 0, text: "Why this method?" },
  { endMs: 77_000, id: "u2", speaker: "student", speakerSource: "model", startMs: 5_000, text: "Because of sampling." },
  { endMs: 80_000, id: "u3", speaker: "unknown", speakerSource: "model", startMs: 77_000, text: "Mumble." },
  { endMs: 90_000, id: "u4", speaker: "student", speakerSource: "teacher", startMs: 80_000, text: "Corrected one." },
];

const questions = [{ endMs: null, id: "q1", prompt: "Why this method?", startMs: 0 }];

function setup(props = {}) {
  const onCorrect = vi.fn();
  render(
    <LabelledTranscript
      onCorrect={onCorrect}
      questions={questions}
      studentFirstName="Daniel"
      utterances={utterances}
      {...props}
    />,
  );
  return { onCorrect };
}

describe("LabelledTranscript", () => {
  it("labels lines in text, and marks unclear speech distinctly", () => {
    setup();
    const items = screen.getAllByRole("listitem").slice(0, 4);

    expect(within(items[0]).getAllByText("Teacher")[0]).toBeInTheDocument();
    expect(within(items[1]).getAllByText("Daniel")[0]).toBeInTheDocument();
    expect(within(items[2]).getAllByText("Speaker unclear")[0]).toBeInTheDocument();
    expect(items[2]).toHaveAttribute("data-speaker", "unknown");
    expect(within(items[3]).getAllByText("(corrected)")[0]).toBeInTheDocument();
  });

  it("falls back to Student without a name", () => {
    setup({ studentFirstName: null });

    expect(screen.getAllByText("Student").length).toBeGreaterThan(0);
  });

  it("corrects a label from the keyboard-operable select", async () => {
    const { onCorrect } = setup();
    const select = screen.getByLabelText(/Speaker for: Mumble/);

    await userEvent.selectOptions(select, "student");

    expect(onCorrect).toHaveBeenCalledWith("u3", "student");
  });

  it("shows talk time for the session and each question, framed as evidence", () => {
    setup();
    const talk = screen.getByRole("region", { name: "Talk time" });

    expect(talk).toHaveTextContent("Daniel 1 min 22 s");
    expect(talk).toHaveTextContent("Longest unbroken Daniel answer 1 min 12 s");
    expect(talk).toHaveTextContent("Why this method?");
    expect(talk).toHaveTextContent("not a score");
  });

  it("shows unstored live words unlabelled", () => {
    setup({ liveTail: "and then more" });

    expect(screen.getByText(/and then more/)).toBeInTheDocument();
    expect(screen.getByText("(speaker not yet known)")).toBeInTheDocument();
  });
});
