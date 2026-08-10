"use client";

import { httpsCallable } from "firebase/functions";
import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { functions } from "@/lib/firebase";
import { disablePushNotifications, enablePushNotifications } from "@/lib/push";

type Status = "checking" | "unsupported" | "misconfigured" | "off" | "denied" | "on";

export function NotificationsToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) {
      setStatus("misconfigured");
      return;
    }
    setStatus(Notification.permission === "granted" ? "on" : Notification.permission === "denied" ? "denied" : "off");
  }, []);

  async function handleEnable() {
    setBusy(true);
    setNotice(null);
    try {
      const result = await enablePushNotifications();
      setStatus(result === "granted" ? "on" : result === "denied" ? "denied" : result);
    } catch {
      setNotice("Couldn't enable notifications — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    setNotice(null);
    try {
      await disablePushNotifications();
      setStatus("off");
    } catch {
      setNotice("Couldn't disable — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSendTest() {
    setBusy(true);
    setNotice(null);
    try {
      const call = httpsCallable(functions, "sendTestNotification");
      await call();
      setNotice("Test sent — you should see it any second.");
    } catch {
      setNotice("Couldn't send a test notification.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Notifications</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Get a push alert on this device when a task is due today or overdue.
      </p>

      {status === "unsupported" && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Not supported in this browser. On iPhone, add this app to your Home Screen first, then try
          from there.
        </p>
      )}
      {status === "misconfigured" && (
        <p className="text-xs text-amber-700 dark:text-amber-400">Notifications aren&apos;t set up yet.</p>
      )}
      {status === "denied" && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Blocked at the browser level — enable notifications for this site in your browser/phone
          settings, then reload.
        </p>
      )}

      {(status === "off" || status === "on") && (
        <button
          type="button"
          onClick={status === "on" ? handleDisable : handleEnable}
          disabled={busy}
          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-50 ${
            status === "on"
              ? "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/60"
              : "bg-brand-600 text-white hover:bg-brand-700"
          }`}
        >
          {status === "on" ? <BellOff size={15} /> : <Bell size={15} />}
          {status === "on" ? "Disable notifications" : "Enable notifications"}
        </button>
      )}

      {status === "on" && (
        <button
          type="button"
          onClick={handleSendTest}
          disabled={busy}
          className="text-xs font-medium text-brand-600 underline disabled:opacity-50 dark:text-brand-400"
        >
          Send test notification
        </button>
      )}

      {notice && <p className="text-xs text-gray-500 dark:text-gray-400">{notice}</p>}
    </div>
  );
}
