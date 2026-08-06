/**
 * Pure prompt-composition and response-parsing for Jake's monthly
 * daycare-calendar upload (spec 3.0.1). Split from the Storage/Gemini IO
 * in parseCalendarUpload.ts the same way the rest of functions/ separates
 * pure logic from network calls.
 */

export interface ParsedCalendarEvent {
  date: string;
  title: string;
}

export function composeCalendarUploadPrompt(kid: string, month: string): string {
  return [
    `This image or PDF is a monthly activity calendar for ${kid}'s daycare, covering ${month} (YYYY-MM).`,
    "Extract every dated, notable day: dress-up/theme days, special events, field trips, closures, early releases, etc.",
    "Skip ordinary days with nothing noted on them.",
    "",
    `Output valid JSON only, as an array of objects: [{ "date": "${month}-DD", "title": "..." }, ...]`,
    `Use exactly the "${month}-DD" date format (4-digit year, 2-digit month, 2-digit day) for every entry.`,
    "If you can't confidently read a date or its label, omit that entry rather than guessing.",
  ].join("\n");
}

function isValidDateForMonth(date: unknown, month: string): date is string {
  return typeof date === "string" && new RegExp(`^${month}-\\d{2}$`).test(date);
}

/**
 * Gemini vision parsing of a photographed/scanned calendar is the least
 * reliable data source in the pipeline (spec 3.0.1), so this is
 * deliberately lenient: malformed individual entries are dropped rather
 * than failing the whole parse, and every event lands unconfirmed for
 * Michelle to review before it affects the brief. Only a completely
 * unparseable response throws.
 */
export function parseCalendarUploadResponse(raw: string, month: string): ParsedCalendarEvent[] {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Gemini response was not valid JSON");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response was not a JSON array");
  }

  const events: ParsedCalendarEvent[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const { date, title } = item as Record<string, unknown>;
    if (!isValidDateForMonth(date, month)) continue;
    if (typeof title !== "string" || !title.trim()) continue;
    events.push({ date, title: title.trim() });
  }
  return events;
}
