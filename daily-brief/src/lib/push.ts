import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { app, db } from "@/lib/firebase";

const SERVICE_WORKER_PATH = "/firebase-messaging-sw.js";
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export type EnableResult = "granted" | "denied" | "unsupported" | "misconfigured";

/**
 * Registers the FCM service worker, asks for notification permission, and
 * stores the resulting device token in Firestore so sendTaskReminders (a
 * Cloud Function) knows where to push to. Safe to call even if push isn't
 * supported (Safari on a non-installed page, etc) — just returns
 * "unsupported" rather than throwing, so the caller can show a plain
 * message instead of a crash.
 */
export async function enablePushNotifications(): Promise<EnableResult> {
  if (typeof window === "undefined" || !("Notification" in window) || !(await isSupported())) {
    return "unsupported";
  }
  if (!VAPID_KEY) return "misconfigured";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) return "denied";

  await setDoc(doc(db, "pushTokens", token), { token, createdAt: serverTimestamp() });
  return "granted";
}

/** Removes this browser's token from Firestore so future reminders skip it. Leaves the OS-level permission as-is. */
export async function disablePushNotifications(): Promise<void> {
  if (typeof window === "undefined" || !(await isSupported()) || !VAPID_KEY) return;

  const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_PATH);
  if (!registration) return;

  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration }).catch(
    () => null,
  );
  if (token) await deleteDoc(doc(db, "pushTokens", token));
}

/** Shows an in-app toast for a push that arrives while this tab is already open (FCM doesn't surface those as OS notifications). */
export function listenForForegroundPush(onReceive: (title: string, body: string) => void): void {
  isSupported().then((supported) => {
    if (!supported) return;
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      onReceive(payload.notification?.title ?? "Daily Brief", payload.notification?.body ?? "");
    });
  });
}
