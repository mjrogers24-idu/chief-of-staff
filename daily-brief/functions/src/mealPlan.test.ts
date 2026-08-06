import { describe, expect, it } from "vitest";
import {
  busyNightsForWeek,
  composeMealPrompt,
  FAMILY_FAVORITES,
  mealForDate,
  mondayOf,
  parseMealPlanResponse,
  weekdayDates,
  type MealDay,
} from "./mealPlan";
import type { CalendarEvent } from "./googleCalendar";
import type { RecurringScheduleItem } from "./recurringSchedule";
import type { RuleLike } from "./ruleMatcher";
import { addDays, toDateKey } from "./dailyIngestion";

describe("mondayOf / weekdayDates", () => {
  it("finds the Monday of the week for a mid-week date", () => {
    const wednesday = new Date("2026-08-12T12:00:00Z"); // Wednesday
    const monday = mondayOf(wednesday);
    expect(toDateKey(monday)).toBe("2026-08-10");
  });

  it("returns the same date when already a Monday", () => {
    const monday = new Date("2026-08-10T12:00:00Z");
    expect(toDateKey(mondayOf(monday))).toBe("2026-08-10");
  });

  it("rolls a Sunday back to the prior Monday, not forward", () => {
    const sunday = new Date("2026-08-16T12:00:00Z");
    expect(toDateKey(mondayOf(sunday))).toBe("2026-08-10");
  });

  it("produces 5 consecutive weekdays starting Monday", () => {
    const monday = new Date("2026-08-10T12:00:00Z");
    const dates = weekdayDates(monday).map(toDateKey);
    expect(dates).toEqual(["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14"]);
  });
});

describe("composeMealPrompt", () => {
  it("includes busy nights, recent meals, and family favorites", () => {
    const prompt = composeMealPrompt(["Wed (field trip)"], ["Tacos", "Spaghetti"]);
    expect(prompt).toContain("Busy nights this week: Wed (field trip)");
    expect(prompt).toContain("Meals served in the last 2-3 weeks (do not repeat): Tacos, Spaghetti");
    for (const favorite of FAMILY_FAVORITES) {
      expect(prompt).toContain(favorite);
    }
  });

  it("uses friendly fallbacks when there's nothing to report", () => {
    const prompt = composeMealPrompt([], []);
    expect(prompt).toContain("Busy nights this week: none flagged");
    expect(prompt).toContain("none on record yet");
  });
});

describe("parseMealPlanResponse", () => {
  const validJson = JSON.stringify({
    days: [
      {
        day: "Mon",
        meal: "Tacos",
        time_minutes: 20,
        prep_type: "stovetop",
        kid_version: "plain",
        adult_lighter_option: "lettuce wrap",
        notes: "",
      },
    ],
    grocery_list: {
      produce_fruit: [],
      produce_veg: ["lettuce"],
      meat_poultry: ["ground beef"],
      dairy_eggs: [],
      canned_jarred: [],
      grains_pasta: [],
      condiments_spices: [],
      frozen: [],
    },
  });

  it("parses a well-formed response", () => {
    const result = parseMealPlanResponse(validJson);
    expect(result.days).toHaveLength(1);
    expect(result.days[0].meal).toBe("Tacos");
    expect(result.groceryList.produce_veg).toEqual(["lettuce"]);
    expect(result.groceryList.frozen).toEqual([]);
  });

  it("strips a markdown code fence before parsing", () => {
    const fenced = "```json\n" + validJson + "\n```";
    const result = parseMealPlanResponse(fenced);
    expect(result.days).toHaveLength(1);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseMealPlanResponse("not json")).toThrow(/not valid JSON/);
  });

  it("throws when days is missing", () => {
    expect(() => parseMealPlanResponse(JSON.stringify({ grocery_list: {} }))).toThrow(/days/);
  });

  it("defaults missing grocery categories to an empty array", () => {
    const result = parseMealPlanResponse(
      JSON.stringify({ days: [{ day: "Mon", meal: "Tacos" }], grocery_list: { produce_veg: ["lettuce"] } }),
    );
    expect(result.groceryList.produce_veg).toEqual(["lettuce"]);
    expect(result.groceryList.frozen).toEqual([]);
    expect(result.days[0].time_minutes).toBe(0);
  });
});

describe("busyNightsForWeek", () => {
  const monday = new Date("2026-08-10T12:00:00Z");
  const dates = weekdayDates(monday);

  const recurring: RecurringScheduleItem[] = [
    { id: "r1", kid: "Josh", label: "PE", daysOfWeek: ["Mon"], note: null },
  ];
  const calendarEvents: CalendarEvent[] = [
    { id: "c1", title: "Riley - Field Trip", date: toDateKey(dates[2]), parent: "michelle" },
  ];
  const rules: RuleLike[] = [
    { keyword: "PE", kid: "Josh", wearNote: "sneakers", dinnerFlag: null },
    { keyword: "field trip", kid: null, wearNote: null, dinnerFlag: "quick-prep" },
  ];

  it("only flags nights where a matched rule sets a dinnerFlag", () => {
    const busy = busyNightsForWeek(dates, recurring, calendarEvents, rules);
    expect(busy).toHaveLength(1);
    expect(busy[0]).toContain("Riley - Field Trip");
  });

  it("returns nothing when no rule sets a dinnerFlag", () => {
    const noFlagRules: RuleLike[] = rules.map((r) => ({ ...r, dinnerFlag: null }));
    expect(busyNightsForWeek(dates, recurring, calendarEvents, noFlagRules)).toHaveLength(0);
  });
});

describe("mealForDate", () => {
  const monday = new Date("2026-08-10T12:00:00Z");
  const days: MealDay[] = [
    {
      day: "Mon",
      meal: "Tacos",
      time_minutes: 20,
      prep_type: "stovetop",
      kid_version: "plain",
      adult_lighter_option: "lettuce wrap",
      notes: "",
    },
  ];

  it("returns null when there's no plan", () => {
    expect(mealForDate(null, monday)).toBeNull();
  });

  it("finds the day matching the date's weekday", () => {
    expect(mealForDate({ days }, monday)?.meal).toBe("Tacos");
  });

  it("returns null for a weekday the plan has no entry for", () => {
    expect(mealForDate({ days }, addDays(monday, 1))).toBeNull();
  });
});
