/**
 * Local-calendar-date formatting for the browser. Deliberately uses the
 * Date object's local getters (which reflect the device's own timezone —
 * Eastern, for this family) rather than `.toISOString()`, which is always
 * UTC and silently rolls over to the next calendar day starting around
 * 8pm Eastern (when Eastern is UTC-4) — well before local midnight.
 */
export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function localMonthKey(date: Date = new Date()): string {
  return localDateKey(date).slice(0, 7);
}
