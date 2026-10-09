import { describe, expect, it } from "vitest";
import {
  buildQuestionWindows,
  computeQuestionTalkTimes,
  computeTalkTime,
  describeStudentTalk,
  formatDuration,
  liveTailBeyondStored,
  speakerLabel,
  type TimedUtterance,
} from "./talkTime";

const u = (
  speaker: TimedUtterance["speaker"],
  startMs: number,
  endMs: number,
): TimedUtterance => ({ endMs, speaker, startMs });

describe("computeTalkTime", () => {
  it("totals each speaker and the student's share", () => {
    const talk = computeTalkTime([
      u("teacher", 0, 2_000),
      u("student", 2_000, 8_000),
    ]);

    expect(talk).toMatchObject({ studentMs: 6_000, teacherMs: 2_000, studentSharePercent: 75 });
  });

  it("does not count gaps", () => {
    const talk = computeTalkTime([u("student", 0, 1_000), u("student", 9_000, 10_000)]);

    expect(talk.studentMs).toBe(2_000);
  });

  it("counts a speaker's own overlapping utterances once", () => {
    expect(
      computeTalkTime([u("student", 0, 5_000), u("student", 3_000, 6_000)]).studentMs,
    ).toBe(6_000);
  });

  it("counts teacher/student overlap for both", () => {
    const talk = computeTalkTime([u("teacher", 0, 4_000), u("student", 2_000, 6_000)]);

    expect(talk.teacherMs).toBe(4_000);
    expect(talk.studentMs).toBe(4_000);
  });

  it("keeps unknown speech out of the share", () => {
    const talk = computeTalkTime([
      u("student", 0, 1_000),
      u("teacher", 1_000, 2_000),
      u("unknown", 2_000, 12_000),
    ]);

    expect(talk.unclearMs).toBe(10_000);
    expect(talk.studentSharePercent).toBe(50);
  });

  it("has no share when nobody is attributed", () => {
    expect(computeTalkTime([u("unknown", 0, 1_000)]).studentSharePercent).toBeNull();
    expect(computeTalkTime([]).studentSharePercent).toBeNull();
  });

  it("ignores empty or inverted spans", () => {
    expect(computeTalkTime([u("student", 5, 5), u("student", 9, 3)]).studentMs).toBe(0);
  });

  it("joins student utterances across a short pause into one answer", () => {
    expect(
      computeTalkTime([u("student", 0, 3_000), u("student", 4_000, 7_000)]).longestStudentRunMs,
    ).toBe(7_000);
  });

  it("splits an answer at a long pause", () => {
    expect(
      computeTalkTime([u("student", 0, 3_000), u("student", 6_000, 8_000)]).longestStudentRunMs,
    ).toBe(3_000);
  });

  it("splits an answer when the teacher or unclear speech intervenes", () => {
    expect(
      computeTalkTime([
        u("student", 0, 3_000),
        u("teacher", 3_000, 3_500),
        u("student", 3_500, 5_000),
      ]).longestStudentRunMs,
    ).toBe(3_000);
    expect(
      computeTalkTime([
        u("student", 0, 2_000),
        u("unknown", 2_000, 2_500),
        u("student", 2_500, 5_000),
      ]).longestStudentRunMs,
    ).toBe(2_500);
  });
});

describe("question windows", () => {
  const windows = buildQuestionWindows([
    { id: "b", startMs: 10_000 },
    { id: "a", startMs: 0 },
  ]);

  it("runs each window to the next ask, the last open-ended", () => {
    expect(windows).toEqual([
      { endMs: 10_000, id: "a", startMs: 0 },
      { endMs: null, id: "b", startMs: 10_000 },
    ]);
  });

  it("clips an utterance that straddles two questions", () => {
    const [a, b] = computeQuestionTalkTimes([u("student", 8_000, 14_000)], windows);

    expect(a.studentMs).toBe(2_000);
    expect(b.studentMs).toBe(4_000);
  });

  it("leaves speech before the first ask out of every question", () => {
    const [only] = computeQuestionTalkTimes(
      [u("teacher", 0, 5_000), u("student", 6_000, 8_000)],
      buildQuestionWindows([{ id: "q", startMs: 5_000 }]),
    );

    expect(only.teacherMs).toBe(0);
    expect(only.studentMs).toBe(2_000);
  });
});

describe("formatting", () => {
  it("formats durations", () => {
    expect(formatDuration(12_000)).toBe("12 s");
    expect(formatDuration(72_000)).toBe("1 min 12 s");
  });

  it("describes student talk with share", () => {
    const talk = computeTalkTime([u("student", 0, 72_000), u("teacher", 72_000, 85_000)]);

    expect(describeStudentTalk(talk)).toBe("Student 1 min 12 s · 85%");
    expect(describeStudentTalk(computeTalkTime([]))).toContain("no speech attributed");
  });

  it("labels speakers", () => {
    expect(speakerLabel("teacher")).toBe("Teacher");
    expect(speakerLabel("student", "Daniel")).toBe("Daniel");
    expect(speakerLabel("student")).toBe("Student");
    expect(speakerLabel("student", "  ")).toBe("Student");
    expect(speakerLabel("unknown", "Daniel")).toBe("Speaker unclear");
  });
});

describe("liveTailBeyondStored", () => {
  it("returns only the words past the stored transcript", () => {
    expect(liveTailBeyondStored("one two three four", "one two")).toBe("three four");
  });

  it("returns the whole live text when nothing is stored", () => {
    expect(liveTailBeyondStored("one two", "")).toBe("one two");
  });

  it("returns nothing once storage has caught up", () => {
    expect(liveTailBeyondStored("one two", "one two three")).toBe("");
  });
});
