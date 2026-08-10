import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { fetchAccounts } from "./firestoreReads";
import { listCalendarsForParent, type CalendarListEntry } from "./googleCalendar";

// Mirrors src/lib/googleOAuth.ts's CALENDAR_EVENTS_SCOPE — see
// createCalendarEvent.ts for why this is redefined here rather than shared.
const CALENDAR_EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar.events";

/**
 * Lists the Google Calendars Michelle's account has access to (one per
 * kid, plus her own) — lets the brain-dump event review UI offer a "which
 * calendar" choice instead of always filing new events on the primary one.
 */
export const listCalendars = onCall(async (request): Promise<{ calendars: CalendarListEntry[] }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const db = getFirestore();
  const accounts = await fetchAccounts(db);
  const michelle = accounts.find(
    (a) => a.parent === "michelle" && (a.scope ?? "").includes(CALENDAR_EVENTS_SCOPE),
  );
  if (!michelle) {
    throw new HttpsError(
      "failed-precondition",
      "Reconnect Google Calendar from the Calendars settings page to see your calendars.",
    );
  }

  try {
    const calendars = await listCalendarsForParent(michelle);
    return { calendars };
  } catch (error) {
    logger.error("listCalendars: Calendar list failed", error);
    throw new HttpsError("internal", "Couldn't load your calendars. Try again.");
  }
});
