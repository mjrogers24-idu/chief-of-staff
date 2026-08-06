import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { addDays, assembleDailyBrief, type DailyBrief } from "./dailyIngestion";
import { composeBriefEmail, GMAIL_SEND_SCOPE, sendBriefEmail } from "./emailBrief";
import { fetchAccounts, fetchRecurringItems, fetchRules, type StoredAccount } from "./firestoreReads";
import { fetchMergedCalendarEvents } from "./googleCalendar";

export { generateMealPlan } from "./generateMealPlan";

initializeApp();

// TODO: set this to the family's actual timezone before deploying —
// determines both when "5am" fires and which calendar day an event falls
// on. Placeholder pending confirmation.
const TIMEZONE = "America/New_York";

/** How many days ahead (inclusive of today) to ingest, per spec 3.2. */
const DAYS_AHEAD = 3;

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

    const [recurringItems, rules, accounts] = await Promise.all([
      fetchRecurringItems(db),
      fetchRules(db),
      fetchAccounts(db),
    ]);

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
