import type { CalendarEvent } from "./googleCalendar";
import { scheduleForDate, type RecurringScheduleItem } from "./recurringSchedule";
import { matchBriefRules, type MatchedAction, type RuleLike, type ScheduleItem } from "./ruleMatcher";

export interface DailyBrief {
  date: string;
  scheduleItems: ScheduleItem[];
  actions: MatchedAction[];
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * Pure composition of a single day's brief from already-fetched data — no
 * Firestore/Google calls here, so this is fully unit-testable. The
 * scheduled function (index.ts) handles the IO and calls this once per
 * date (today + next 2 days, per spec 3.2).
 */
export function assembleDailyBrief(
  date: Date,
  recurringItems: RecurringScheduleItem[],
  calendarEvents: CalendarEvent[],
  rules: RuleLike[],
): DailyBrief {
  const dateKey = toDateKey(date);

  const recurringForDate: ScheduleItem[] = scheduleForDate(recurringItems, date).map((item) => ({
    id: item.id,
    title: item.label,
    date: dateKey,
    kid: item.kid,
    source: "recurring",
  }));

  const calendarForDate: ScheduleItem[] = calendarEvents
    .filter((event) => event.date === dateKey)
    .map((event) => ({
      id: `${event.parent}:${event.id}`,
      title: event.title,
      date: dateKey,
      kid: null,
      source: "calendar",
    }));

  const scheduleItems = [...recurringForDate, ...calendarForDate];
  const actions = matchBriefRules(scheduleItems, rules);

  return { date: dateKey, scheduleItems, actions };
}
