import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { composeBrainDumpPrompt, parseBrainDumpResponse, type BrainDumpProposals } from "./brainDump";
import { toDateKey, todayInEastern } from "./dailyIngestion";
import { callGemini } from "./gemini";

interface ParseBrainDumpRequest {
  text: string;
}

/**
 * Triggered from /admin/braindump — Michelle types or dictates a free-form
 * note and this sorts it into task/event/meal proposals. Nothing is saved
 * here; the client shows each proposal for review and only writes it
 * (addOpenTask / createCalendarEvent / upsertMealDay) once she confirms,
 * same confirm-before-use pattern as the daycare-calendar upload and inbox
 * scan.
 */
export const parseBrainDump = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const { text } = (request.data ?? {}) as Partial<ParseBrainDumpRequest>;
  if (!text || !text.trim()) {
    throw new HttpsError("invalid-argument", "text is required.");
  }

  const todayDateKey = toDateKey(todayInEastern());
  const prompt = composeBrainDumpPrompt(text, todayDateKey);

  // Same split as generateMealPlan's error handling: distinguish a failed
  // Gemini call (quota, bad key) from a successful call that didn't return
  // parseable JSON, so Cloud Logging shows which stage actually broke.
  let raw: string;
  try {
    raw = await callGemini(prompt);
  } catch (error) {
    logger.error("parseBrainDump: Gemini call failed", error);
    throw new HttpsError("internal", "Couldn't reach the assistant. Try again.");
  }

  let proposals: BrainDumpProposals;
  try {
    proposals = parseBrainDumpResponse(raw);
  } catch (error) {
    logger.error("parseBrainDump: couldn't parse Gemini's response", { error, raw });
    throw new HttpsError("internal", "Got a response but couldn't make sense of it. Try again.");
  }

  return proposals;
});
