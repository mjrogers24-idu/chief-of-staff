import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { fetchAccounts } from "./firestoreReads";
import { createEventForParent } from "./googleCalendar";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// Mirrors src/lib/googleOAuth.ts's CALENDAR_EVENTS_SCOPE — redefined here
// rather than imported since functions/ is a separate package from the
// Next app (same pattern as scanInboxFollowUps.ts's own GMAIL_READONLY_SCOPE).
const CALENDAR_EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar.events";

interface CreateCalendarEventRequest {
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM 24-hour, optional */
  time?: string | null;
  location?: string | null;
  /** A specific calendar's id, or "primary" (the default) for Michelle's own calendar. */
  calendarId?: string;
}

/**
 * Writes a real event onto Michelle's Google Calendar — used to confirm an
 * "events" proposal from the brain-dump chat. Always uses Michelle's own
 * account regardless of who the event is nominally for: she's the only
 * connection with write scope (spec follows the same "only her account
 * gets extra permissions" pattern as gmail.send/gmail.readonly).
 */
export const createCalendarEvent = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const { title, date, time, location, calendarId } = (request.data ?? {}) as Partial<CreateCalendarEventRequest>;
  if (!title || !title.trim() || !date) {
    throw new HttpsError("invalid-argument", "title and date are required.");
  }
  if (!DATE_PATTERN.test(date)) {
    throw new HttpsError("invalid-argument", "date must be YYYY-MM-DD.");
  }
  if (time && !TIME_PATTERN.test(time)) {
    throw new HttpsError("invalid-argument", "time must be HH:MM (24-hour).");
  }

  const db = getFirestore();
  const accounts = await fetchAccounts(db);
  const michelle = accounts.find(
    (a) => a.parent === "michelle" && (a.scope ?? "").includes(CALENDAR_EVENTS_SCOPE),
  );
  if (!michelle) {
    throw new HttpsError(
      "failed-precondition",
      "Reconnect Google Calendar from the Calendars settings page to allow adding events.",
    );
  }

  try {
    const eventId = await createEventForParent(michelle, {
      title: title.trim(),
      date,
      time: time ?? null,
      location: location?.trim() || null,
      calendarId: calendarId?.trim() || "primary",
    });
    return { eventId };
  } catch (error) {
    logger.error("createCalendarEvent: Calendar insert failed", error);
    throw new HttpsError("internal", "Couldn't add that to Google Calendar. Try again.");
  }
});
