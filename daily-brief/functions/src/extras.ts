/**
 * Pure composition for the spec 3.4 extras — weather note, prep-ahead
 * flag, and travel/away-parent note. No IO here (weather fetching lives
 * in weather.ts); this only turns already-fetched data into the strings
 * that land in the brief.
 */

import type { DailyBrief } from "./dailyIngestion";
import type { CalendarEvent, Parent } from "./googleCalendar";
import type { DayForecast } from "./weather";

export function formatWeatherNote(forecast: DayForecast | undefined): string | null {
  if (!forecast) return null;

  const { high, low, precipitationProbability } = forecast;
  let clothing: string;
  if (high >= 85) clothing = "shorts, light clothes";
  else if (high >= 70) clothing = "light layers";
  else if (high >= 50) clothing = "layers, light jacket";
  else clothing = "warm coat";

  const parts = [`${Math.round(high)}°F / ${Math.round(low)}°F`, clothing];
  if (precipitationProbability >= 40) parts.push("bring a rain jacket");
  return parts.join(" — ");
}

/**
 * "If tomorrow is packed, flag tonight for prep-ahead" (spec 3.4) — a
 * night counts as packed using the same signal the nutritionist agent
 * uses for busy nights: a matched rule with a dinnerFlag set.
 */
export function computePrepAheadNote(tomorrow: DailyBrief | undefined): string | null {
  if (!tomorrow) return null;
  const flagged = tomorrow.actions.filter((a) => a.rule.dinnerFlag);
  if (flagged.length === 0) return null;
  const reasons = flagged.map((a) => a.item.title).join(", ");
  return `Tomorrow is busy (${reasons}) — consider prepping ahead tonight (crockpot, marinate, pack bags).`;
}

const PARENT_LABEL: Record<Parent, string> = { michelle: "Michelle", dan: "Dan" };

function otherParent(parent: Parent): Parent {
  return parent === "michelle" ? "dan" : "michelle";
}

/** Which parents have a calendar event that day matching a travel keyword. */
export function detectTravelingParents(
  calendarEvents: CalendarEvent[],
  dateKey: string,
  keyword = "travel",
): Parent[] {
  const lowerKeyword = keyword.toLowerCase();
  const matches = calendarEvents.filter(
    (event) => event.date === dateKey && event.title.toLowerCase().includes(lowerKeyword),
  );
  return [...new Set(matches.map((event) => event.parent))];
}

export function composeTravelNote(travelingParents: Parent[]): string | null {
  if (travelingParents.length === 0) return null;
  if (travelingParents.length === 2) {
    return "Both parents have travel on the calendar today — double-check pickup/dinner coverage.";
  }
  const [parent] = travelingParents;
  return `${PARENT_LABEL[parent]} is traveling today — ${PARENT_LABEL[otherParent(parent)]} covering pickup/dinner logistics.`;
}
