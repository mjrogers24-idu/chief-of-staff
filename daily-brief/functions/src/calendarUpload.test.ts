import { describe, expect, it } from "vitest";
import { composeCalendarUploadPrompt, parseCalendarUploadResponse } from "./calendarUpload";

describe("composeCalendarUploadPrompt", () => {
  it("includes the kid, month, and expected date format", () => {
    const prompt = composeCalendarUploadPrompt("Jake", "2026-10");
    expect(prompt).toContain("Jake's daycare");
    expect(prompt).toContain("2026-10");
    expect(prompt).toContain("2026-10-DD");
  });
});

describe("parseCalendarUploadResponse", () => {
  it("parses a well-formed array", () => {
    const raw = JSON.stringify([
      { date: "2026-10-14", title: "Crazy hair day" },
      { date: "2026-10-22", title: "Field trip" },
    ]);
    const events = parseCalendarUploadResponse(raw, "2026-10");
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ date: "2026-10-14", title: "Crazy hair day" });
  });

  it("strips a markdown code fence before parsing", () => {
    const fenced = '```json\n[{"date":"2026-10-14","title":"Crazy hair day"}]\n```';
    expect(parseCalendarUploadResponse(fenced, "2026-10")).toHaveLength(1);
  });

  it("drops entries with a date outside the target month", () => {
    const raw = JSON.stringify([
      { date: "2026-10-14", title: "In month" },
      { date: "2026-11-01", title: "Wrong month" },
    ]);
    const events = parseCalendarUploadResponse(raw, "2026-10");
    expect(events).toEqual([{ date: "2026-10-14", title: "In month" }]);
  });

  it("drops entries missing a title or with a malformed date", () => {
    const raw = JSON.stringify([
      { date: "2026-10-14", title: "" },
      { date: "10/14/2026", title: "Bad date format" },
      { date: "2026-10-15" },
      { date: "2026-10-16", title: "Good one" },
    ]);
    const events = parseCalendarUploadResponse(raw, "2026-10");
    expect(events).toEqual([{ date: "2026-10-16", title: "Good one" }]);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseCalendarUploadResponse("not json", "2026-10")).toThrow(/not valid JSON/);
  });

  it("throws when the response isn't an array", () => {
    expect(() => parseCalendarUploadResponse(JSON.stringify({ foo: "bar" }), "2026-10")).toThrow(
      /not a JSON array/,
    );
  });

  it("returns an empty array when nothing in the response matches", () => {
    expect(parseCalendarUploadResponse("[]", "2026-10")).toEqual([]);
  });
});
