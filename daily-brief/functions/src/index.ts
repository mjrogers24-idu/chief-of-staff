import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { addDays, assembleDailyBrief, type DailyBrief } from "./dailyIngestion";
import { composeBriefEmail, GMAIL_SEND_SCOPE, sendBriefEmail } from "./emailBrief";
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

interface StoredAccount extends GoogleAccount {
  email: string | null;
  scope: string | null;
}

async function sendTodaysBriefEmail(accounts: StoredAccount[], brief: DailyBrief): Promise<void> {
  const sender = accounts.find(
    (a) => a.parent === "michelle" && (a.scope ?? "").includes(GMAIL_SEND_SCOPE),
  );
  if (!sender) {
    logger.info("Skipping brief email: Michelle hasn't granted gmail.send yet.");
    return;
  }

  const recipients = [...new Set(accounts.map((a) => a.email).filter((e): e is string => !!e))];
  if (recipients.length === 0) {
    logger.info("Skipping brief email: no connected account has a known email address.");
    return;
  }

  try {
    const content = composeBriefEmail(brief);
    await sendBriefEmail(sender.refreshToken, recipients, sender.email, content);
    logger.info(`Sent brief email to ${recipients.join(", ")}`);
  } catch (error) {
    logger.error("Failed to send brief email", error);
  }
}

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

    const accounts: StoredAccount[] = accountsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        parent: doc.id as Parent,
        refreshToken: data.refreshToken,
        email: data.email ?? null,
        scope: data.scope ?? null,
      };
    });

    const calendarEvents = await fetchMergedCalendarEvents(
      accounts,
      dates[0],
      addDays(dates[dates.length - 1], 1),
      (account, error) => logger.error(`Calendar fetch failed for ${account.parent}`, error),
    );

    const briefs = dates.map((date) => assembleDailyBrief(date, recurringItems, calendarEvents, rules));

    await Promise.all(
      briefs.map((brief) =>
        db
          .collection("dailyBriefs")
          .doc(brief.date)
          .set({ ...brief, generatedAt: new Date().toISOString() }),
      ),
    );

    logger.info(`Daily ingestion wrote briefs for ${briefs.map((b) => b.date).join(", ")}`);

    await sendTodaysBriefEmail(accounts, briefs[0]);
  },
);
