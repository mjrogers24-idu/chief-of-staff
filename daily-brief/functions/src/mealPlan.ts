import { assembleDailyBrief, type UploadedEvent } from "./dailyIngestion";
import type { CalendarEvent } from "./googleCalendar";
import { weekdayOf, type RecurringScheduleItem } from "./recurringSchedule";
import type { RuleLike } from "./ruleMatcher";

/**
 * Household specifics gathered from Michelle (spec 3.4) — the static half
 * of the nutritionist-agent system prompt. The dynamic half (busy nights,
 * recent meals) is filled in per-run by composeMealPrompt.
 */
export const MEAL_PLAN_SYSTEM_PROMPT_INTRO = `You are a family meal-planning assistant. Generate a 5-night dinner plan.

Household: 2 adults + 4 kids, cooking for 6 people per night.
Dietary restrictions: none/no allergies. Kids prefer plain proteins/carbs
and skip vegetable toppings; adults want full toppings (lettuce, tomato,
sour cream, etc). Favor "build-your-own" style meals (tacos, bowls, etc)
where kids and adults can customize their own plate from shared components.

Adult calorie awareness: Michelle and Dan are calorie-conscious. For each
meal, note a lighter option or swap for the adult portion (e.g. lettuce
wrap instead of tortilla, cauliflower rice option, load up on veg
toppings, lean protein swap) without changing what's cooked for the kids.

Skill/time: default meals 20-30 min or slow-cooker; busy nights ≤20 min
active time. Comfort favorites: hamburger helper-style one-skillet meals
and slow-cooker meals are welcome staples, not just backups.`;

export const FAMILY_FAVORITES = [
  "Million Dollar Spaghetti + garlic bread",
  "White Chicken Chili over rice with Fritos",
  "Chicken Nuggets + tots",
  "Tacos (build-your-own)",
  "Crockpot BBQ Chicken on King's Hawaiian rolls",
];

const OUTPUT_SCHEMA_INSTRUCTIONS = `Output valid JSON only, in this shape:
{
  "days": [
    {
      "day": "Mon",
      "meal": "...",
      "time_minutes": 20,
      "prep_type": "one-skillet | slow-cooker | oven | stovetop",
      "kid_version": "...",
      "adult_lighter_option": "...",
      "notes": "..."
    }
  ],
  "grocery_list": {
    "produce_fruit": ["..."],
    "produce_veg": ["..."],
    "meat_poultry": ["..."],
    "dairy_eggs": ["..."],
    "canned_jarred": ["..."],
    "grains_pasta": ["..."],
    "condiments_spices": ["..."],
    "frozen": ["..."]
  }
}`;

export function composeMealPrompt(busyNights: string[], recentMeals: string[]): string {
  return [
    MEAL_PLAN_SYSTEM_PROMPT_INTRO,
    "",
    `Busy nights this week: ${busyNights.length ? busyNights.join("; ") : "none flagged"}`,
    `Meals served in the last 2-3 weeks (do not repeat): ${
      recentMeals.length ? recentMeals.join(", ") : "none on record yet"
    }`,
    `Family favorites (rotate these in regularly): ${FAMILY_FAVORITES.join(", ")}.`,
    "",
    OUTPUT_SCHEMA_INSTRUCTIONS,
  ].join("\n");
}

export interface MealDay {
  day: string;
  meal: string;
  time_minutes: number;
  prep_type: string;
  kid_version: string;
  adult_lighter_option: string;
  notes: string;
}

const GROCERY_CATEGORIES = [
  "produce_fruit",
  "produce_veg",
  "meat_poultry",
  "dairy_eggs",
  "canned_jarred",
  "grains_pasta",
  "condiments_spices",
  "frozen",
] as const;

export type GroceryList = Record<(typeof GROCERY_CATEGORIES)[number], string[]>;

export interface ParsedMealPlan {
  days: MealDay[];
  groceryList: GroceryList;
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object") throw new Error(`${label} is not an object`);
  return value as Record<string, unknown>;
}

function validateDay(raw: unknown, index: number): MealDay {
  const d = requireObject(raw, `days[${index}]`);
  if (typeof d.day !== "string" || typeof d.meal !== "string") {
    throw new Error(`days[${index}] is missing "day" or "meal"`);
  }
  return {
    day: d.day,
    meal: d.meal,
    time_minutes: typeof d.time_minutes === "number" ? d.time_minutes : 0,
    prep_type: typeof d.prep_type === "string" ? d.prep_type : "",
    kid_version: typeof d.kid_version === "string" ? d.kid_version : "",
    adult_lighter_option: typeof d.adult_lighter_option === "string" ? d.adult_lighter_option : "",
    notes: typeof d.notes === "string" ? d.notes : "",
  };
}

function validateGroceryList(raw: unknown): GroceryList {
  const obj = requireObject(raw, "grocery_list");
  const result = {} as GroceryList;
  for (const category of GROCERY_CATEGORIES) {
    const value = obj[category];
    result[category] = Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  }
  return result;
}

/**
 * Gemini is instructed to return JSON only, but models sometimes wrap it
 * in a markdown code fence anyway — strip that before parsing. Throws a
 * descriptive error on anything that doesn't match the expected shape
 * rather than silently accepting malformed data.
 */
export function parseMealPlanResponse(raw: string): ParsedMealPlan {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Gemini response was not valid JSON");
  }

  const obj = requireObject(parsed, "response");
  if (!Array.isArray(obj.days)) throw new Error('Response is missing a "days" array');

  return {
    days: obj.days.map(validateDay),
    groceryList: validateGroceryList(obj.grocery_list),
  };
}

export function mondayOf(date: Date): Date {
  const day = date.getDay(); // 0 = Sunday .. 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const result = new Date(date);
  result.setDate(date.getDate() + diffToMonday);
  return result;
}

export function weekdayDates(monday: Date): Date[] {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/** This week's planned dinner for a given date, if one was generated (weekends have none). */
export function mealForDate(plan: { days: MealDay[] } | null, date: Date): MealDay | null {
  if (!plan) return null;
  const label = weekdayOf(date);
  return plan.days.find((day) => day.day === label) ?? null;
}

/**
 * A weeknight counts as "busy" when the rules engine flagged a
 * dinner-affecting event that day (briefRules.dinnerFlag) — reuses the
 * same recurring-schedule + calendar + rule-matching pipeline as
 * dailyIngestion rather than depending on its 3-day dailyBriefs output,
 * since meal planning needs the full Mon-Fri window regardless of when
 * in the week it's generated.
 */
export function busyNightsForWeek(
  dates: Date[],
  recurringItems: RecurringScheduleItem[],
  calendarEvents: CalendarEvent[],
  rules: RuleLike[],
  uploadedEvents: UploadedEvent[] = [],
): string[] {
  const lines: string[] = [];
  for (const date of dates) {
    const brief = assembleDailyBrief(date, recurringItems, calendarEvents, rules, uploadedEvents);
    const flagged = brief.actions.filter((a) => a.rule.dinnerFlag);
    if (flagged.length > 0) {
      lines.push(`${weekdayOf(date)} (${flagged.map((a) => a.item.title).join(", ")})`);
    }
  }
  return lines;
}
