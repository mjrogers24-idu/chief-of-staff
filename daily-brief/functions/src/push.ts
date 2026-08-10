import type { Firestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { logger } from "firebase-functions";

export interface PushMessage {
  title: string;
  body: string;
}

/** FCM error codes meaning the token is permanently dead and should stop being used. */
const DEAD_TOKEN_ERRORS = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

/**
 * Sends a push notification to every registered device (pushTokens
 * collection), and prunes any tokens FCM reports as dead — e.g. the app
 * was uninstalled, or notification permission was revoked outside the
 * app. Used by both sendTestNotification and sendTaskReminders.
 */
export async function sendPushToAllTokens(db: Firestore, message: PushMessage): Promise<{ sent: number; removed: number }> {
  const snap = await db.collection("pushTokens").get();
  if (snap.empty) return { sent: 0, removed: 0 };

  const tokens = snap.docs.map((d) => d.id);
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title: message.title, body: message.body },
  });

  const deadTokens: string[] = [];
  res.responses.forEach((r, i) => {
    if (!r.success && r.error && DEAD_TOKEN_ERRORS.has(r.error.code)) {
      deadTokens.push(tokens[i]);
    } else if (!r.success) {
      logger.error("sendPushToAllTokens: send failed for a token", r.error);
    }
  });

  if (deadTokens.length > 0) {
    const batch = db.batch();
    deadTokens.forEach((token) => batch.delete(db.collection("pushTokens").doc(token)));
    await batch.commit();
  }

  return { sent: res.successCount, removed: deadTokens.length };
}
