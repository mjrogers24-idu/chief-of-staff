import { describe, expect, it } from "vitest";
import {
  composeTravelNote,
  computePrepAheadNote,
  detectTravelingParents,
  formatWeatherNote,
} from "./extras";
import type { DailyBrief } from "./dailyIngestion";
import type { CalendarEvent } from "./googleCalendar";

describe("formatWeatherNote", () => {
  it("returns null when there's no forecast", () => {
    expect(formatWeatherNote(undefined)).toBeNull();
  });

  it("suggests light clothes for a hot day", () => {
    const note = formatWeatherNote({ high: 88, low: 70, precipitationProbability: 0 });
    expect(note).toBe("88°F / 70°F — shorts, light clothes");
  });

  it("suggests a warm coat for a cold day", () => {
    const note = formatWeatherNote({ high: 38, low: 25, precipitationProbability: 0 });
    expect(note).toBe("38°F / 25°F — warm coat");
  });

  it("adds a rain jacket note when precipitation chance is high", () => {
    const note = formatWeatherNote({ high: 65, low: 50, precipitationProbability: 60 });
    expect(note).toBe("65°F / 50°F — layers, light jacket — bring a rain jacket");
  });
});

function brief(overrides: Partial<DailyBrief>): DailyBrief {
  return { date: "2026-08-06", scheduleItems: [], actions: [], ...overrides };
}

describe("computePrepAheadNote", () => {
  it("returns null when there's no tomorrow brief", () => {
    expect(computePrepAheadNote(undefined)).toBeNull();
  });

  it("returns null when tomorrow has no dinner-flagged actions", () => {
    const tomorrow = brief({
      actions: [
        {
          item: { id: "1", title: "PE", date: "2026-08-07", kid: "Josh", source: "recurring" },
          rule: { keyword: "PE", kid: "Josh", wearNote: "sneakers", dinnerFlag: null },
        },
      ],
    });
    expect(computePrepAheadNote(tomorrow)).toBeNull();
  });

  it("flags tonight when tomorrow has a dinner-flagged action", () => {
    const tomorrow = brief({
      actions: [
        {
          item: { id: "1", title: "Field Trip", date: "2026-08-07", kid: "Riley", source: "calendar" },
          rule: { keyword: "field trip", kid: null, wearNote: null, dinnerFlag: "quick-prep" },
        },
      ],
    });
    const note = computePrepAheadNote(tomorrow);
    expect(note).toContain("Tomorrow is busy (Field Trip)");
    expect(note).toContain("prepping ahead tonight");
  });
});

describe("detectTravelingParents / composeTravelNote", () => {
  const events: CalendarEvent[] = [
    { id: "1", title: "Dan - travel to Chicago", date: "2026-08-06", parent: "dan" },
    { id: "2", title: "Regular meeting", date: "2026-08-06", parent: "michelle" },
    { id: "3", title: "Travel - conference", date: "2026-08-07", parent: "michelle" },
  ];

  it("detects a single traveling parent for a date", () => {
    expect(detectTravelingParents(events, "2026-08-06")).toEqual(["dan"]);
  });

  it("returns nothing for a date with no travel events", () => {
    expect(detectTravelingParents(events, "2026-08-09")).toEqual([]);
  });

  it("composes a note naming the traveling parent and who covers logistics", () => {
    const note = composeTravelNote(["dan"]);
    expect(note).toBe("Dan is traveling today — Michelle covering pickup/dinner logistics.");
  });

  it("returns null when nobody is traveling", () => {
    expect(composeTravelNote([])).toBeNull();
  });

  it("composes a combined note when both parents are traveling", () => {
    const note = composeTravelNote(["michelle", "dan"]);
    expect(note).toContain("Both parents");
  });
});
