import { describe, expect, it } from "vitest";
import { makeSignedRecord } from "./vivaRecordPage.fixture";
import {
  buildRecordPageModel,
  paginateQuestionCounts,
} from "./vivaRecordPage";

const context = { studentName: "Sam Lee", submissionTitle: "Poetry defence" };

describe("buildRecordPageModel", () => {
  it("summarises the signed snapshot", () => {
    const model = buildRecordPageModel(makeSignedRecord(10, 2), context);

    expect(model.summary).toEqual({
      duration: "25 min 30 s",
      observations: 12,
      questionsAsked: "10 + 2 follow-ups",
      recording: "Attached",
    });
    expect(model.evidence.map((e) => [e.label, e.count])).toEqual([
      ["Clear understanding", 4],
      ["Probe further", 0],
      ["Concern", 4],
    ]);
    expect(model.conclusion.options.filter((o) => o.selected)).toHaveLength(1);
    expect(model.signed).toEqual({
      at: "2026-05-01T10:30:00.000Z",
      by: "Ms Patel",
    });
    expect(model.amended).toBeNull();
  });

  it("uses singular follow-up and omits it when there are none", () => {
    expect(
      buildRecordPageModel(makeSignedRecord(5, 1), context).summary
        .questionsAsked,
    ).toBe("5 + 1 follow-up");
    expect(
      buildRecordPageModel(makeSignedRecord(6, 0), context).summary
        .questionsAsked,
    ).toBe("6");
  });

  it("reports no recording and no talk time when absent", () => {
    const record = makeSignedRecord(1, 0);
    record.snapshot = { ...record.snapshot, recording: null };
    const model = buildRecordPageModel(record, context);

    expect(model.summary.recording).toBe("Not attached");
    expect(model.talkTimeSharePercent).toBeNull();
  });

  it("shows the latest amendment's content and date", () => {
    const model = buildRecordPageModel(makeSignedRecord(1, 0), {
      ...context,
      amendments: [
        {
          authorId: "t1",
          authorName: "Ms Patel",
          changes: [
            { field: "conclusion", from: "further_review_required", to: "understanding_demonstrated" },
          ],
          createdAt: "2026-05-03T09:00:00.000Z",
          id: "a1",
          reason: "Reviewed recording",
          version: 1,
        },
      ],
    });

    expect(model.amended).toEqual({ at: "2026-05-03T09:00:00.000Z", version: 1 });
    expect(model.conclusion.options.find((o) => o.selected)?.value).toBe(
      "understanding_demonstrated",
    );
  });
});

describe("paginateQuestionCounts", () => {
  it("keeps a typical viva on one page", () => {
    expect(paginateQuestionCounts(12)).toEqual([12]);
    expect(paginateQuestionCounts(0)).toEqual([0]);
  });

  it("overflows long vivas and leaves room for the signature on the last page", () => {
    expect(paginateQuestionCounts(13)).toEqual([8, 5]);
    expect(paginateQuestionCounts(30)).toEqual([8, 16, 6]);

    for (let n = 13; n < 80; n++) {
      const pages = paginateQuestionCounts(n);

      expect(pages.reduce((a, b) => a + b, 0)).toBe(n);
      expect(pages.every((p) => p > 0)).toBe(true);
      expect(pages[pages.length - 1]).toBeLessThanOrEqual(12);
    }
  });
});
