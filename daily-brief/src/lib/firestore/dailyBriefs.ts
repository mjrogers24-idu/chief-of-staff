import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { RuleLike, ScheduleItem } from "@/lib/ruleMatcher";

const COLLECTION = "dailyBriefs";

export interface MatchedActionDoc {
  item: ScheduleItem;
  rule: RuleLike;
}

/** Written by the dailyIngestion Cloud Function (functions/src/index.ts). */
export interface DailyBriefDoc {
  date: string;
  scheduleItems: ScheduleItem[];
  actions: MatchedActionDoc[];
  generatedAt: string;
}

export function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function subscribeDailyBrief(
  date: string,
  onChange: (brief: DailyBriefDoc | null) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    doc(db, COLLECTION, date),
    (snap) => onChange(snap.exists() ? (snap.data() as DailyBriefDoc) : null),
    onError,
  );
}
