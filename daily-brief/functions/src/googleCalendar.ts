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
