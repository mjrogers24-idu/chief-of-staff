import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { RuleLike, ScheduleItem } from "@/lib/ruleMatcher";

export interface MatchedAction {
  item: ScheduleItem;
  rule: RuleLike;
}

export interface DaySchedule {
  date: string;
  scheduleItems: ScheduleItem[];
  actions: MatchedAction[];
}

/** Live (not cached) schedule for an arbitrary date — powers the /admin/schedule-view day browser. */
export async function getScheduleForDate(date: string): Promise<DaySchedule> {
  const call = httpsCallable<{ date: string }, DaySchedule>(functions, "getScheduleForDate");
  const result = await call({ date });
  return result.data;
}
