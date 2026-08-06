import type { Firestore } from "firebase-admin/firestore";
import type { UploadedEvent } from "./dailyIngestion";
import type { GoogleAccount, Parent } from "./googleCalendar";
import type { RecurringScheduleItem } from "./recurringSchedule";
import type { RuleLike } from "./ruleMatcher";

export interface StoredAccount extends GoogleAccount {
  email: string | null;
  scope: string | null;
}

export async function fetchRecurringItems(db: Firestore): Promise<RecurringScheduleItem[]> {
  const snap = await db.collection("recurringSchedule").get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      kid: data.kid,
      label: data.label,
      daysOfWeek: data.daysOfWeek ?? [],
      note: data.note ?? null,
    };
  });
}

export async function fetchRules(db: Firestore): Promise<RuleLike[]> {
  const snap = await db.collection("briefRules").get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      keyword: data.keyword,
      kid: data.kid ?? null,
      wearNote: data.wearNote ?? null,
      dinnerFlag: data.dinnerFlag ?? null,
    };
  });
}

export async function fetchAccounts(db: Firestore): Promise<StoredAccount[]> {
  const snap = await db.collection("googleAccounts").get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      parent: doc.id as Parent,
      refreshToken: data.refreshToken,
      email: data.email ?? null,
      scope: data.scope ?? null,
    };
  });
}

/** Confirmed events parsed from an uploaded daycare calendar, in a date range (inclusive). */
export async function fetchConfirmedUploadedEvents(
  db: Firestore,
  fromDateKey: string,
  toDateKey: string,
): Promise<UploadedEvent[]> {
  const snap = await db
    .collection("uploadedEvents")
    .where("confirmed", "==", true)
    .where("date", ">=", fromDateKey)
    .where("date", "<=", toDateKey)
    .get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return { id: doc.id, kid: data.kid, date: data.date, title: data.title };
  });
}
