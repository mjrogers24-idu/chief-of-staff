import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { toDateKey, todayInEastern } from "./dailyIngestion";
import { fetchOpenTasks } from "./firestoreReads";
import { sendPushToAllTokens } from "./push";

const TIMEZONE = "America/New_York";
const MAX_TITLES_IN_BODY = 3;

function composeReminderBody(titles: string[]): string {
  const shown = titles.slice(0, MAX_TITLES_IN_BODY).join(", ");
  const remaining = titles.length - MAX_TITLES_IN_BODY;
  return remaining > 0 ? `${shown}, +${remaining} more` : shown;
}

/**
 * Runs after dailyIngestion's 5am data-prep (which isn't a sensible time to
 * actually alert a phone) — checks for tasks due today or already overdue
 * and sends one push digest if there are any. Silent (no push, no error)
 * when the list is empty or nobody has notifications enabled yet.
 */
export const sendTaskReminders = onSchedule(
  { schedule: "0 8 * * *", timeZone: TIMEZONE },
  async () => {
    const db = getFirestore();
    const todayDateKey = toDateKey(todayInEastern());

    const openTasks = await fetchOpenTasks(db);
    const due = openTasks.filter((t) => t.dueDate !== null && t.dueDate <= todayDateKey);
    if (due.length === 0) {
      logger.info("sendTaskReminders: nothing due today or overdue — skipping.");
      return;
    }

    try {
      const result = await sendPushToAllTokens(db, {
        title: due.length === 1 ? "1 task due" : `${due.length} tasks due`,
        body: composeReminderBody(due.map((t) => t.title)),
      });
      logger.info(`sendTaskReminders: sent to ${result.sent} device(s), pruned ${result.removed} dead token(s).`);
    } catch (error) {
      logger.error("sendTaskReminders: send failed", error);
    }
  },
);
