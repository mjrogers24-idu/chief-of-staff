import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  addDays,
  assembleDailyBrief,
  toDateKey,
  todayInEastern,
  type BriefDocument,
  type DailyBrief,
} from "./dailyIngestion";
import { composeBriefEmail, GMAIL_SEND_SCOPE, sendBriefEmail } from "./emailBrief";
import { composeTravelNote, computePrepAheadNote, detectTravelingParents, formatWeatherNote } from "./extras";
import {
  fetchAccounts,
  fetchConfirmedUploadedEvents,
  fetchOpenTasks,
  fetchRecurringItems,
  fetchRules,
  type StoredAccount,
} from "./firestoreReads";
import { fetchMergedCalendarEvents, type CalendarEvent } from "./googleCalendar";
import { mealForDate, mondayOf, type MealDay } from "./mealPlan";
import { fetchForecast, type DayForecast } from "./weather";

export { createCalendarEvent } from "./createCalendarEvent";
export { generateMealPlan } from "./generateMealPlan";
export { getScheduleForDate } from "./getScheduleForDate";
export { listCalendars } from "./listCalendars";
export { parseBrainDump } from "./parseBrainDump";
export { parseCalendarUpload } from "./parseCalendarUpload";
export { parseRecipeUpload } from "./parseRecipeUpload";
export { scanInboxFollowUps } from "./scanInboxFollowUps";

initializeApp();

// Eastern time (Greer, SC) — determines both when "5am" fires and which
// calendar day an event falls on.
const TIMEZONE = "America/New_York";

/** How many days ahead (inclusive of today) to ingest, per spec 3.2. */
const DAYS_AHEAD = 3;

async function sendTodaysBriefEmail(accounts: StoredAccount[], brief: BriefDocument): Promise<void> {
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

async function loadForecast(): Promise<Map<string, DayForecast>> {
  const lat = process.env.WEATHER_LATITUDE;
  const lon = process.env.WEATHER_LONGITUDE;
  if (!lat || !lon) {
    logger.info("Skipping weather: WEATHER_LATITUDE/WEATHER_LONGITUDE are not set.");
    return new Map();
  }
  try {
    return await fetchForecast(Number(lat), Number(lon));
  } catch (error) {
    logger.error("Weather fetch failed", error);
    return new Map();
  }
}

async function loadThisWeeksMealPlan(
  db: FirebaseFirestore.Firestore,
): Promise<{ days: MealDay[] } | null> {
  const weekStart = toDateKey(mondayOf(todayInEastern()));
  const snap = await db.collection("mealPlans").doc(weekStart).get();
  if (!snap.exists) return null;
  return { days: (snap.data()?.days ?? []) as MealDay[] };
}

function buildBriefDocuments(
  dates: Date[],
  briefs: DailyBrief[],
  calendarEvents: CalendarEvent[],
  forecast: Map<string, DayForecast>,
  openTasks: { id: string; title: string; dueDate: string | null }[],
  mealPlan: { days: MealDay[] } | null,
): BriefDocument[] {
  return briefs.map((brief, i) => ({
    ...brief,
    generatedAt: new Date().toISOString(),
    weatherNote: formatWeatherNote(forecast.get(brief.date)),
    prepAheadNote: computePrepAheadNote(briefs[i + 1]),
    travelNote: composeTravelNote(detectTravelingParents(calendarEvents, brief.date)),
    openTasks,
    dinnerTonight: mealForDate(mealPlan, dates[i]),
  }));
}

export const dailyIngestion = onSchedule(
  { schedule: "0 5 * * *", timeZone: TIMEZONE },
  async () => {
    const db = getFirestore();
    const today = todayInEastern();
    const dates = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i));

    const [recurringItems, rules, accounts, openTasks] = await Promise.all([
      fetchRecurringItems(db),
      fetchRules(db),
      fetchAccounts(db),
      fetchOpenTasks(db),
    ]);

    const [calendarEvents, uploadedEvents, forecast, mealPlan] = await Promise.all([
      fetchMergedCalendarEvents(
        accounts,
        dates[0],
        addDays(dates[dates.length - 1], 1),
        (account, error) => logger.error(`Calendar fetch failed for ${account.parent}`, error),
      ),
      fetchConfirmedUploadedEvents(db, toDateKey(dates[0]), toDateKey(dates[dates.length - 1])),
      loadForecast(),
      loadThisWeeksMealPlan(db),
    ]);

    const briefs = dates.map((date) =>
      assembleDailyBrief(date, recurringItems, calendarEvents, rules, uploadedEvents),
    );
    const briefDocuments = buildBriefDocuments(dates, briefs, calendarEvents, forecast, openTasks, mealPlan);

    await Promise.all(
      briefDocuments.map((doc) => db.collection("dailyBriefs").doc(doc.date).set(doc)),
    );

    logger.info(`Daily ingestion wrote briefs for ${briefDocuments.map((b) => b.date).join(", ")}`);

    await sendTodaysBriefEmail(accounts, briefDocuments[0]);
  },
);
