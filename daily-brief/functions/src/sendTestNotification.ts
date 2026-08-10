import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { sendPushToAllTokens } from "./push";

/** Triggered from the "Send test" button in /admin/more, right after enabling notifications. */
export const sendTestNotification = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  try {
    const result = await sendPushToAllTokens(getFirestore(), {
      title: "Daily Brief",
      body: "Notifications are working! 🎉",
    });
    if (result.sent === 0) {
      throw new HttpsError("failed-precondition", "No devices are registered for notifications yet.");
    }
    return result;
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("sendTestNotification: send failed", error);
    throw new HttpsError("internal", "Couldn't send the test notification.");
  }
});
