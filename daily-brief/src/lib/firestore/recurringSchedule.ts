import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const COLLECTION = "recurringSchedule";

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/**
 * A recurring weekly commitment for a kid — e.g. "Josh has PE Mon/Thu".
 * Empty daysOfWeek means it applies every day (e.g. a fixed lunch time).
 */
export interface RecurringScheduleItem {
  id: string;
  kid: string;
  label: string;
  daysOfWeek: Weekday[];
  note: string | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type RecurringScheduleInput = Pick<
  RecurringScheduleItem,
  "kid" | "label" | "daysOfWeek" | "note"
>;

export const STARTER_RECURRING_SCHEDULE: RecurringScheduleInput[] = [
  { kid: "Josh", label: "PE", daysOfWeek: ["Mon", "Thu"], note: null },
  { kid: "Riley", label: "PE", daysOfWeek: ["Tue", "Thu"], note: null },
];

function scheduleCollection() {
  return collection(db, COLLECTION);
}

export function subscribeRecurringSchedule(
  onChange: (items: RecurringScheduleItem[]) => void,
  onError: (error: Error) => void,
) {
  const q = query(scheduleCollection(), orderBy("kid"));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as RecurringScheduleItem,
      );
      onChange(items);
    },
    onError,
  );
}

export function addRecurringScheduleItem(input: RecurringScheduleInput) {
  return addDoc(scheduleCollection(), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function updateRecurringScheduleItem(id: string, input: RecurringScheduleInput) {
  return updateDoc(doc(db, COLLECTION, id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export function deleteRecurringScheduleItem(id: string) {
  return deleteDoc(doc(db, COLLECTION, id));
}

/** Weekday abbreviation for a JS Date, matching the Weekday type. */
export function weekdayOf(date: Date): Weekday {
  return WEEKDAYS[(date.getDay() + 6) % 7];
}

/** Items that apply on the given date (empty daysOfWeek = every day). */
export function scheduleForDate(
  items: RecurringScheduleItem[],
  date: Date,
): RecurringScheduleItem[] {
  const day = weekdayOf(date);
  return items.filter((item) => item.daysOfWeek.length === 0 || item.daysOfWeek.includes(day));
}
