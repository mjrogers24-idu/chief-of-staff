import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { addDays, assembleDailyBrief } from "./dailyIngestion";
import { fetchMergedCalendarEvents, type GoogleAccount, type Parent } from "./googleCalendar";
import type { RecurringScheduleItem } from "./recurringSchedule";
import type { RuleLike } from "./ruleMatcher";

initializeApp();

// TODO: set this to the family's actual timezone before deploying —
// determines both when "5am" fires and which calendar day an event falls
// on. Placeholder pending confirmation.
const TIMEZONE = "America/New_York";

/** How many days ahead (inclusive of today) to ingest, per spec 3.2. */
const DAYS_AHEAD = 3;

export const dailyIngestion = onSchedule(
  { schedule: "0 5 * * *", timeZone: TIMEZONE },
  async () => {
    const db = getFirestore();
    const today = new Date();
    const dates = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i));

    const [scheduleSnap, rulesSnap, accountsSnap] = await Promise.all([
      db.collection("recurringSchedule").get(),
      db.collection("briefRules").get(),
      db.collection("googleAccounts").get(),
    ]);

    const recurringItems: RecurringScheduleItem[] = scheduleSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        kid: data.kid,
        label: data.label,
        daysOfWeek: data.daysOfWeek ?? [],
        note: data.note ?? null,
      };
    });

    const rules: RuleLike[] = rulesSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        keyword: data.keyword,
        kid: data.kid ?? null,
        wearNote: data.wearNote ?? null,
        dinnerFlag: data.dinnerFlag ?? null,
      };
    });

    const accounts: GoogleAccount[] = accountsSnap.docs.map((doc) => ({
      parent: doc.id as Parent,
      refreshToken: doc.data().refreshToken,
    }));

    const calendarEvents = await fetchMergedCalendarEvents(
      accounts,
      dates[0],
      addDays(dates[dates.length - 1], 1),
      (account, error) => logger.error(`Calendar fetch failed for ${account.parent}`, error),
    );

    await Promise.all(
      dates.map(async (date) => {
        const brief = assembleDailyBrief(date, recurringItems, calendarEvents, rules);
        await db
          .collection("dailyBriefs")
          .doc(brief.date)
          .set({
            ...brief,
            generatedAt: new Date().toISOString(),
          });
      }),
    );

    logger.info(`Daily ingestion wrote briefs for ${dates.map((d) => d.toISOString().slice(0, 10)).join(", ")}`);
  },
);
