import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export interface CalendarListEntry {
  id: string;
  summary: string;
  primary: boolean;
}

/** The Google Calendars Michelle's account has access to (one per kid, plus her own). */
export async function listCalendars(): Promise<CalendarListEntry[]> {
  const call = httpsCallable<void, { calendars: CalendarListEntry[] }>(functions, "listCalendars");
  const result = await call();
  return result.data.calendars;
}

/**
 * Best-effort default calendar for a kid's name, matched against each
 * calendar's display name — e.g. "Josh" matches a calendar named "Josh" or
 * "Josh's Activities". Falls back to "primary" (Michelle's own calendar)
 * when there's no match or no kid guess at all; always overridable by hand.
 */
export function defaultCalendarIdFor(kid: string | null, calendars: CalendarListEntry[]): string {
  if (kid) {
    const needle = kid.trim().toLowerCase();
    const match = calendars.find((cal) => cal.summary.toLowerCase().includes(needle));
    if (match) return match.id;
  }
  return "primary";
}
