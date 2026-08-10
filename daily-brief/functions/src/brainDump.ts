/**
 * Pure prompt-composition and response-parsing for the "brain dump" chat —
 * Michelle rambles a stream-of-consciousness note and this sorts it into
 * tasks, calendar events, and dinner plans. Same split-from-IO pattern as
 * mealPlan.ts / calendarUpload.ts / emailFollowUps.ts.
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface TaskProposal {
  title: string;
  /** YYYY-MM-DD, or null if no date was stated or implied. */
  dueDate: string | null;
}

export interface EventProposal {
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM 24-hour, or null for an all-day/no-specific-time event. */
  time: string | null;
}

export interface MealProposal {
  /** YYYY-MM-DD */
  date: string;
  meal: string;
  notes: string;
}

export interface BrainDumpProposals {
  tasks: TaskProposal[];
  events: EventProposal[];
  meals: MealProposal[];
}

export function composeBrainDumpPrompt(text: string, todayDateKey: string): string {
  return [
    "You are a household assistant that turns a parent's rambling, unstructured notes into",
    "organized, actionable items. Read the note below and pull out every actionable item,",
    "sorting each into exactly one category:",
    "",
    '- "tasks": paperwork, errands, phone calls, things to remember or do. Include a due date',
    "  only if one is stated or clearly implied.",
    '- "events": anything that belongs on a calendar — appointments, activities, practices,',
    "  pickups/dropoffs, plans with a specific day. Only include an event if you can determine",
    "  a specific date for it.",
    '- "meals": dinner plans or ideas mentioned for a specific night. Only include a meal if you',
    "  can determine a specific date for it.",
    "",
    `Today's date is ${todayDateKey}. Convert relative dates ("Thursday", "next Tuesday",`,
    '"tomorrow", "in two weeks") into absolute YYYY-MM-DD dates using today as the anchor — a',
    "weekday name with no other qualifier means the next upcoming occurrence of that weekday.",
    "If a time is mentioned for an event, convert it to 24-hour HH:MM.",
    "",
    "Skip vague musings that aren't actionable (e.g. \"I should really get better organized\").",
    "A single note may contain zero, one, or many items of each type.",
    "",
    'Note:\n"""',
    text.trim(),
    '"""',
    "",
    "Output valid JSON only, in this shape:",
    "{",
    '  "tasks": [{ "title": "...", "dueDate": "YYYY-MM-DD or omit" }],',
    '  "events": [{ "title": "...", "date": "YYYY-MM-DD", "time": "HH:MM or omit" }],',
    '  "meals": [{ "date": "YYYY-MM-DD", "meal": "...", "notes": "optional extra detail or omit" }]',
    "}",
    'Use empty arrays for any category with nothing to add — e.g. "tasks": [].',
  ].join("\n");
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object") throw new Error(`${label} is not an object`);
  return value as Record<string, unknown>;
}

function cleanTitle(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function validTaskProposal(raw: unknown): TaskProposal | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const title = cleanTitle(r.title);
  if (!title) return null;
  const dueDate = typeof r.dueDate === "string" && DATE_PATTERN.test(r.dueDate) ? r.dueDate : null;
  return { title, dueDate };
}

function validEventProposal(raw: unknown): EventProposal | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const title = cleanTitle(r.title);
  if (!title) return null;
  if (typeof r.date !== "string" || !DATE_PATTERN.test(r.date)) return null;
  const time = typeof r.time === "string" && TIME_PATTERN.test(r.time) ? r.time : null;
  return { title, date: r.date, time };
}

function validMealProposal(raw: unknown): MealProposal | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const meal = cleanTitle(r.meal);
  if (!meal) return null;
  if (typeof r.date !== "string" || !DATE_PATTERN.test(r.date)) return null;
  const notes = typeof r.notes === "string" ? r.notes.trim() : "";
  return { date: r.date, meal, notes };
}

/**
 * Gemini is instructed to return JSON only, but strips a markdown fence if
 * present anyway. Deliberately lenient like parseFollowUpResponse (these
 * are casual best-effort suggestions Michelle reviews before anything is
 * saved, not a confirmed data source) — a malformed individual item is
 * dropped rather than failing the whole parse. Only a totally broken
 * top-level response throws.
 */
export function parseBrainDumpResponse(raw: string): BrainDumpProposals {
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

  const tasks = Array.isArray(obj.tasks) ? obj.tasks.map(validTaskProposal).filter((t): t is TaskProposal => !!t) : [];
  const events = Array.isArray(obj.events)
    ? obj.events.map(validEventProposal).filter((e): e is EventProposal => !!e)
    : [];
  const meals = Array.isArray(obj.meals) ? obj.meals.map(validMealProposal).filter((m): m is MealProposal => !!m) : [];

  return { tasks, events, meals };
}
