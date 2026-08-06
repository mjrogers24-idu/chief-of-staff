/**
 * Types + pure date-matching helpers mirrored from
 * ../../src/lib/firestore/recurringSchedule.ts (the CRUD/Firestore-client
 * half of that file isn't needed here — this project reads the collection
 * directly via firebase-admin).
 */

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface RecurringScheduleItem {
  id: string;
  kid: string;
  label: string;
  daysOfWeek: Weekday[];
  note: string | null;
}

export function weekdayOf(date: Date): Weekday {
  return WEEKDAYS[(date.getDay() + 6) % 7];
}

export function scheduleForDate(
  items: RecurringScheduleItem[],
  date: Date,
): RecurringScheduleItem[] {
  const day = weekdayOf(date);
  return items.filter((item) => item.daysOfWeek.length === 0 || item.daysOfWeek.includes(day));
}
