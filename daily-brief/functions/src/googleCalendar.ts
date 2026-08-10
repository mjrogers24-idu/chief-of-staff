import { google } from "googleapis";

export type Parent = "michelle" | "dan";

export interface GoogleAccount {
  parent: Parent;
  refreshToken: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  /** YYYY-MM-DD, collapsed from an all-day date or a dateTime */
  date: string;
  parent: Parent;
}

function buildClient(refreshToken: string) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET are not set");
  }
  // Built from googleapis' own re-export (not the standalone
  // google-auth-library package) so its OAuth2Client type matches what
  // google.calendar({ auth }) below expects — mixing the two produces
  // structurally-similar-but-distinct classes that TypeScript rejects.
  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export async function fetchEventsForParent(
  account: GoogleAccount,
  timeMin: Date,
  timeMax: Date,
): Promise<CalendarEvent[]> {
  const auth = buildClient(account.refreshToken);
  const calendar = google.calendar({ version: "v3", auth });

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  return (res.data.items ?? [])
    .filter((event) => event.status !== "cancelled" && (event.summary ?? "").trim().length > 0)
    .map((event) => ({
      id: event.id!,
      title: event.summary!,
      date: (event.start?.date ?? event.start?.dateTime ?? "").slice(0, 10),
      parent: account.parent,
    }))
    .filter((event) => event.date.length === 10);
}

export interface NewCalendarEvent {
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM 24-hour, or null for an all-day event. */
  time: string | null;
}

// Same anchor as dailyIngestion.ts's TIMEZONE — events created here should
// land on the calendar day Michelle meant, not shift with the Cloud
// Function's UTC process timezone.
const EVENT_TIMEZONE = "America/New_York";

function addOneDay(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** `time` (HH:MM) one hour later, rolling over to the next date if needed. */
function plusOneHour(date: string, time: string): { date: string; time: string } {
  const [h, m] = time.split(":").map(Number);
  const hour = h + 1;
  if (hour >= 24) return { date: addOneDay(date), time: `${String(hour - 24).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
  return { date, time: `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
}

/**
 * Creates a new event on the parent's primary Google Calendar — the write
 * side of the brain-dump chat feature. Timed events default to a 1-hour
 * duration (Google Calendar's own UI does the same when you don't set an
 * end time); all-day events use the exclusive-end-date convention the
 * Calendar API expects (end.date is the day *after* the event).
 */
export async function createEventForParent(account: GoogleAccount, event: NewCalendarEvent): Promise<string> {
  const auth = buildClient(account.refreshToken);
  const calendar = google.calendar({ version: "v3", auth });

  const requestBody = event.time
    ? (() => {
        const end = plusOneHour(event.date, event.time!);
        return {
          summary: event.title,
          start: { dateTime: `${event.date}T${event.time}:00`, timeZone: EVENT_TIMEZONE },
          end: { dateTime: `${end.date}T${end.time}:00`, timeZone: EVENT_TIMEZONE },
        };
      })()
    : {
        summary: event.title,
        start: { date: event.date },
        end: { date: addOneDay(event.date) },
      };

  const res = await calendar.events.insert({ calendarId: "primary", requestBody });
  if (!res.data.id) throw new Error("Calendar insert returned no event id");
  return res.data.id;
}

/**
 * Merges both parents' calendars into one tagged list. A single parent's
 * fetch failing (revoked/expired token, API error) shouldn't take down the
 * whole ingestion run — that parent's events are just missing that day.
 */
export async function fetchMergedCalendarEvents(
  accounts: GoogleAccount[],
  timeMin: Date,
  timeMax: Date,
  onError?: (account: GoogleAccount, error: unknown) => void,
): Promise<CalendarEvent[]> {
  const results = await Promise.all(
    accounts.map(async (account) => {
      try {
        return await fetchEventsForParent(account, timeMin, timeMax);
      } catch (error) {
        onError?.(account, error);
        return [];
      }
    }),
  );
  return results.flat();
}
