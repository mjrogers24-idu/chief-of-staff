import { describe, expect, it } from "vitest";
import { addDays, assembleDailyBrief, toDateKey } from "./dailyIngestion";
import type { CalendarEvent } from "./googleCalendar";
import type { RecurringScheduleItem } from "./recurringSchedule";
import type { RuleLike } from "./ruleMatcher";

const monday = new Date("2026-08-10T12:00:00Z"); // a Monday

const recurring: RecurringScheduleItem[] = [
  { id: "r1", kid: "Josh", label: "PE", daysOfWeek: ["Mon", "Thu"], note: null },
  { id: "r2", kid: "Riley", label: "PE", daysOfWeek: ["Tue", "Thu"], note: null },
];

const calendarEvents: CalendarEvent[] = [
  { id: "c1", title: "Riley - Field Trip", date: toDateKey(monday), parent: "michelle" },
  { id: "c2", title: "Dan travel - Chicago", date: toDateKey(addDays(monday, 1)), parent: "dan" },
];

const rules: RuleLike[] = [
  { keyword: "PE", kid: "Josh", wearNote: "sneakers", dinnerFlag: null },
  { keyword: "field trip", kid: null, wearNote: "check permission slip", dinnerFlag: null },
];

describe("assembleDailyBrief", () => {
  it("combines recurring items due that day with calendar events for that day", () => {
    const brief = assembleDailyBrief(monday, recurring, calendarEvents, rules);

    expect(brief.date).toBe(toDateKey(monday));
    expect(brief.scheduleItems.map((i) => i.title).sort()).toEqual(
      ["PE", "Riley - Field Trip"].sort(),
    );
  });

  it("excludes recurring items and calendar events for other days", () => {
    const brief = assembleDailyBrief(monday, recurring, calendarEvents, rules);
    expect(brief.scheduleItems.some((i) => i.title.includes("Riley") && i.source === "recurring")).toBe(
      false,
    );
    expect(brief.scheduleItems.some((i) => i.title.includes("Chicago"))).toBe(false);
  });

  it("runs rule matching against the assembled items", () => {
    const brief = assembleDailyBrief(monday, recurring, calendarEvents, rules);
    expect(brief.actions).toHaveLength(2);
    const wearNotes = brief.actions.map((a) => a.rule.wearNote).sort();
    expect(wearNotes).toEqual(["check permission slip", "sneakers"]);
  });

  it("returns no schedule items or actions for a day with nothing on it", () => {
    const wednesday = addDays(monday, 2);
    const brief = assembleDailyBrief(wednesday, recurring, calendarEvents, rules);
    expect(brief.scheduleItems).toHaveLength(0);
    expect(brief.actions).toHaveLength(0);
  });
});
