import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { parseDateKey } from "@/lib/dates";
import { addOpenTask } from "@/lib/firestore/openTasks";
import { MEAL_PLAN_WEEKDAYS, currentWeekStart, upsertMealDay, type MealPlanWeekday } from "@/lib/firestore/mealPlans";

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

/** Sorts a rambling note into task/event/meal proposals. Nothing is saved yet. */
export async function parseBrainDump(text: string): Promise<BrainDumpProposals> {
  const call = httpsCallable<{ text: string }, BrainDumpProposals>(functions, "parseBrainDump");
  const result = await call({ text });
  return result.data;
}

export function confirmTaskProposal(proposal: TaskProposal): Promise<unknown> {
  return addOpenTask({ title: proposal.title, dueDate: proposal.dueDate });
}

/** Writes the event onto Michelle's real Google Calendar via the createCalendarEvent Cloud Function. */
export async function confirmEventProposal(proposal: EventProposal): Promise<void> {
  const call = httpsCallable<{ title: string; date: string; time: string | null }, { eventId: string }>(
    functions,
    "createCalendarEvent",
  );
  await call({ title: proposal.title, date: proposal.date, time: proposal.time });
}

const JS_DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Mon-Fri weekday label for a YYYY-MM-DD date, or null for a Sat/Sun date (meal plans don't track weekends). */
export function weekdayLabelFor(dateKey: string): MealPlanWeekday | null {
  const label = JS_DAY_LABELS[parseDateKey(dateKey).getDay()];
  return (MEAL_PLAN_WEEKDAYS as readonly string[]).includes(label) ? (label as MealPlanWeekday) : null;
}

/** Throws if the proposal's date is a weekend — check weekdayLabelFor first to show a friendlier error. */
export function confirmMealProposal(proposal: MealProposal): Promise<void> {
  const date = parseDateKey(proposal.date);
  const day = weekdayLabelFor(proposal.date);
  if (!day) throw new Error("Meal plans only cover weeknights (Mon-Fri).");

  return upsertMealDay(currentWeekStart(date), {
    day,
    meal: proposal.meal,
    time_minutes: 0,
    prep_type: "",
    kid_version: "",
    adult_lighter_option: "",
    notes: proposal.notes,
  });
}
