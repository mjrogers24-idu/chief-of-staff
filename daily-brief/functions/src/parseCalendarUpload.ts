import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { composeCalendarUploadPrompt, parseCalendarUploadResponse } from "./calendarUpload";
import { callGeminiVision } from "./gemini";

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

interface ParseCalendarUploadRequest {
  kid: string;
  /** YYYY-MM */
  month: string;
  /** Path within the default Storage bucket, e.g. "daycare-calendars/Jake/2026-10/abc.jpg" */
  storagePath: string;
}

/**
 * Triggered from /admin/daycare right after the client finishes uploading
 * the calendar image/PDF to Storage. Parses it with Gemini vision and
 * writes the results as unconfirmed uploadedEvents (spec 3.0.1) —
 * Michelle reviews/confirms before they affect the brief, since vision
 * parsing of a photographed calendar is the least reliable data source in
 * the pipeline. Re-running this for the same kid+month replaces whatever
 * was parsed there before, confirmed or not, so a re-upload doesn't leave
 * stale duplicates.
 */
export const parseCalendarUpload = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const data = (request.data ?? {}) as Partial<ParseCalendarUploadRequest>;
  const { kid, month, storagePath } = data;
  if (!kid || !month || !storagePath) {
    throw new HttpsError("invalid-argument", "kid, month, and storagePath are required.");
  }
  if (!MONTH_PATTERN.test(month)) {
    throw new HttpsError("invalid-argument", "month must be in YYYY-MM format.");
  }

  const bucket = getStorage().bucket();
  const file = bucket.file(storagePath);
  const [exists] = await file.exists();
  if (!exists) {
    throw new HttpsError("not-found", "Uploaded file not found — try uploading again.");
  }

  const [buffer] = await file.download();
  const [metadata] = await file.getMetadata();
  const mimeType = metadata.contentType ?? "application/octet-stream";

  let events;
  try {
    const raw = await callGeminiVision(composeCalendarUploadPrompt(kid, month), [
      { base64Data: buffer.toString("base64"), mimeType },
    ]);
    events = parseCalendarUploadResponse(raw, month);
  } catch (error) {
    logger.error("Calendar upload parsing failed", error);
    throw new HttpsError(
      "internal",
      "Couldn't parse that calendar. Try a clearer photo, or a different file.",
    );
  }

  const db = getFirestore();
  const uploadId = `${kid}_${month}_${Date.now()}`;

  const existing = await db
    .collection("uploadedEvents")
    .where("kid", "==", kid)
    .where("month", "==", month)
    .get();

  const batch = db.batch();
  existing.docs.forEach((doc) => batch.delete(doc.ref));

  const created: { id: string; date: string; title: string }[] = [];
  for (const event of events) {
    const ref = db.collection("uploadedEvents").doc();
    batch.set(ref, {
      kid,
      month,
      date: event.date,
      title: event.title,
      confirmed: false,
      source: "uploaded-calendar",
      uploadId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    created.push({ id: ref.id, date: event.date, title: event.title });
  }
  await batch.commit();

  logger.info(`Parsed ${created.length} event(s) from ${kid}'s ${month} calendar upload`);
  return { events: created };
});
