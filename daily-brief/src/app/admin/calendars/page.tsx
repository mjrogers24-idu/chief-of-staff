"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authedFetch } from "@/lib/authedFetch";
import { PARENTS, type Parent } from "@/lib/parents";

interface AccountStatus {
  parent: Parent;
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
}

const PARENT_LABEL: Record<Parent, string> = { michelle: "Michelle", dan: "Dan" };

function CalendarsPageInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<AccountStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyParent, setBusyParent] = useState<Parent | null>(null);

  const notice = searchParams.get("error")
    ? `Couldn't connect: ${searchParams.get("error")}`
    : searchParams.get("connected")
      ? `Connected ${PARENT_LABEL[searchParams.get("connected") as Parent] ?? searchParams.get("connected")}'s calendar.`
      : null;

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authedFetch(user, "/api/google/status");
      if (!res.ok) throw new Error("status request failed");
      const data = await res.json();
      setAccounts(data.accounts);
    } catch {
      setError("Couldn't load connection status.");
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleConnect(parent: Parent) {
    if (!user) return;
    setBusyParent(parent);
    try {
      const res = await authedFetch(user, "/api/google/connect-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent }),
      });
      if (!res.ok) throw new Error("connect-url request failed");
      const data = await res.json();
      window.location.href = data.url;
    } catch {
      setError("Couldn't start the Google sign-in flow.");
      setBusyParent(null);
    }
  }

  async function handleDisconnect(parent: Parent) {
    if (!user) return;
    if (!confirm(`Disconnect ${PARENT_LABEL[parent]}'s Google Calendar?`)) return;
    setBusyParent(parent);
    try {
      const res = await authedFetch(user, "/api/google/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent }),
      });
      if (!res.ok) throw new Error("disconnect request failed");
      await refresh();
    } catch {
      setError("Couldn't disconnect.");
    } finally {
      setBusyParent(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-gray-500">
        Read-only access to each parent&apos;s Google Calendar, used to pull one-off events
        (practices, field trips, appointments) into the brief. Michelle&apos;s connection also
        grants permission to send the morning brief email — her consent screen will list an
        extra &quot;send email&quot; permission that Dan&apos;s doesn&apos;t.
      </p>

      {notice && <p className="rounded bg-gray-100 px-3 py-2 text-sm text-gray-700">{notice}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {accounts === null && !error ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {PARENTS.map((parent) => {
            const account = accounts?.find((a) => a.parent === parent);
            const connected = account?.connected ?? false;
            return (
              <div
                key={parent}
                className="flex items-center justify-between rounded border border-gray-200 p-4"
              >
                <div>
                  <p className="font-medium">{PARENT_LABEL[parent]}</p>
                  <p className="text-sm text-gray-500">
                    {connected ? account?.email || "Connected" : "Not connected"}
                  </p>
                </div>
                {connected ? (
                  <button
                    onClick={() => handleDisconnect(parent)}
                    disabled={busyParent === parent}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(parent)}
                    disabled={busyParent === parent}
                    className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CalendarsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">Loading…</p>}>
      <CalendarsPageInner />
    </Suspense>
  );
}
