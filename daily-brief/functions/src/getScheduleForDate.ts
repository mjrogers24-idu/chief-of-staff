import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { addDays, assembleDailyBrief, type DailyBrief } from "./dailyIngestion";
import { fetchAccounts, fetchConfirmedUploadedEvents, fetchRecurringItems, fetchRules } from "./firestoreReads";
import { fetchMergedCalendarEvents } from "./googleCalendar";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface GetScheduleForDateRequest {
  /** YYYY-MM-DD */
  date: string;
}

/**
 * Triggered from /admin/schedule-view — an on-demand version of
 * dailyIngestion's per-day assembly for browsing any single date, rather
 * than just the pre-baked today+2-days window dailyBriefs stores. Pulls
 * live (not cached) so it always reflects the current recurring
 * schedule/rules/calendar state, unlike dailyBriefs which only refreshes
 * at 5am.
 */
export const getScheduleForDate = onCall(async (request): Promise<DailyBrief> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const { date } = (request.data ?? {}) as Partial<GetScheduleForDateRequest>;
  if (!date || !DATE_PATTERN.test(date)) {
    throw new HttpsError("invalid-argument", "date must be YYYY-MM-DD.");
  }

  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(y, m - 1, d);

  const db = getFirestore();
  const [recurringItems, rules, accounts] = await Promise.all([
    fetchRecurringItems(db),
    fetchRules(db),
    fetchAccounts(db),
  ]);

  const [calendarEvents, uploadedEvents] = await Promise.all([
    fetchMergedCalendarEvents(accounts, target, addDays(target, 1), (account, error) =>
      logger.error(`Calendar fetch failed for ${account.parent}`, error),
    ),
    fetchConfirmedUploadedEvents(db, date, date),
  ]);

  return assembleDailyBrief(target, recurringItems, calendarEvents, rules, uploadedEvents);
});
