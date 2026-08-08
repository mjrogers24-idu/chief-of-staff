import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { composeFollowUpPrompt, parseFollowUpResponse } from "./emailFollowUps";
import { fetchAccounts } from "./firestoreReads";
import { callGemini } from "./gemini";
import { fetchRecentInboxMessages } from "./gmailInbox";

const TIMEZONE = "America/New_York";
export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

/**
 * Runs on the same 5am schedule as dailyIngestion but is its own function
 * rather than folded into that handler — a Gmail-scan failure here
 * shouldn't put the brief/email critical path at risk. Suggestions are
 * never auto-added as real tasks (same confirm-before-use pattern as
 * uploadedEvents/parseCalendarUpload): Michelle reviews and confirms or
 * dismisses each one from /admin/tasks. A suggestion doc is keyed by
 * Gmail message id and deleted once handled, so a message already
 * reviewed today won't be re-suggested by a later run the same day.
 */
export const scanInboxFollowUps = onSchedule(
  { schedule: "0 5 * * *", timeZone: TIMEZONE },
  async () => {
    const db = getFirestore();
    const accounts = await fetchAccounts(db);
    const michelle = accounts.find(
      (a) => a.parent === "michelle" && (a.scope ?? "").includes(GMAIL_READONLY_SCOPE),
    );
    if (!michelle) {
      logger.info("Skipping inbox scan: Michelle hasn't granted gmail.readonly.");
      return;
    }

    let messages;
    try {
      messages = await fetchRecentInboxMessages(michelle.refreshToken);
    } catch (error) {
      logger.error("scanInboxFollowUps: inbox fetch failed", error);
      return;
    }
    if (messages.length === 0) {
      logger.info("Inbox scan: no messages in the last 24h.");
      return;
    }

    let suggestions;
    try {
      const raw = await callGemini(composeFollowUpPrompt(messages));
      suggestions = parseFollowUpResponse(raw, messages);
    } catch (error) {
      logger.error("scanInboxFollowUps: suggestion generation failed", error);
      return;
    }

    let written = 0;
    for (const suggestion of suggestions) {
      const ref = db.collection("emailFollowUps").doc(suggestion.messageId);
      const existing = await ref.get();
      if (existing.exists) continue;
      await ref.set({
        from: suggestion.from,
        subject: suggestion.subject,
        reason: suggestion.reason,
        receivedAt: suggestion.receivedAt,
        createdAt: FieldValue.serverTimestamp(),
      });
      written++;
    }

    logger.info(`Inbox scan: suggested ${written} new follow-up(s) of ${suggestions.length} flagged.`);
  },
);
