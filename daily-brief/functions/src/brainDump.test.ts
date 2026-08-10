import { describe, expect, it } from "vitest";
import { composeBrainDumpPrompt, parseBrainDumpResponse } from "./brainDump";

describe("composeBrainDumpPrompt", () => {
  it("includes today's date and the raw note text", () => {
    const prompt = composeBrainDumpPrompt("call the dentist, tacos thursday", "2026-08-10");
    expect(prompt).toContain("2026-08-10");
    expect(prompt).toContain("call the dentist, tacos thursday");
  });
});

describe("parseBrainDumpResponse", () => {
  it("parses a well-formed response with all three categories", () => {
    const raw = JSON.stringify({
      tasks: [{ title: "Call the dentist", dueDate: "2026-08-14" }],
      events: [{ title: "Jake's checkup", date: "2026-08-12", time: "14:30" }],
      meals: [{ date: "2026-08-13", meal: "Tacos", notes: "kids' favorite" }],
    });
    expect(parseBrainDumpResponse(raw)).toEqual({
      tasks: [{ title: "Call the dentist", dueDate: "2026-08-14" }],
      events: [{ title: "Jake's checkup", date: "2026-08-12", time: "14:30" }],
      meals: [{ date: "2026-08-13", meal: "Tacos", notes: "kids' favorite" }],
    });
  });

  it("strips a markdown code fence", () => {
    const raw = "```json\n" + JSON.stringify({ tasks: [], events: [], meals: [] }) + "\n```";
    expect(parseBrainDumpResponse(raw)).toEqual({ tasks: [], events: [], meals: [] });
  });

  it("defaults missing category arrays to empty", () => {
    expect(parseBrainDumpResponse("{}")).toEqual({ tasks: [], events: [], meals: [] });
  });

  it("drops a task missing a title", () => {
    const raw = JSON.stringify({ tasks: [{ dueDate: "2026-08-14" }], events: [], meals: [] });
    expect(parseBrainDumpResponse(raw).tasks).toEqual([]);
  });

  it("keeps a task with no due date, coercing it to null", () => {
    const raw = JSON.stringify({ tasks: [{ title: "Pick up dry cleaning" }], events: [], meals: [] });
    expect(parseBrainDumpResponse(raw).tasks).toEqual([{ title: "Pick up dry cleaning", dueDate: null }]);
  });

  it("drops an event missing a date", () => {
    const raw = JSON.stringify({ tasks: [], events: [{ title: "Practice" }], meals: [] });
    expect(parseBrainDumpResponse(raw).events).toEqual([]);
  });

  it("drops an event with a malformed time rather than the whole event", () => {
    const raw = JSON.stringify({
      tasks: [],
      events: [{ title: "Practice", date: "2026-08-12", time: "not-a-time" }],
      meals: [],
    });
    expect(parseBrainDumpResponse(raw).events).toEqual([{ title: "Practice", date: "2026-08-12", time: null }]);
  });

  it("drops a meal missing a date", () => {
    const raw = JSON.stringify({ tasks: [], events: [], meals: [{ meal: "Tacos" }] });
    expect(parseBrainDumpResponse(raw).meals).toEqual([]);
  });

  it("throws on unparseable JSON", () => {
    expect(() => parseBrainDumpResponse("not json")).toThrow("not valid JSON");
  });
});
