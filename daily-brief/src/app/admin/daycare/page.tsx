"use client";

import { useEffect, useState } from "react";
import { localMonthKey } from "@/lib/dates";
import { subscribeUploadedEvents, type UploadedEvent } from "@/lib/firestore/uploadedEvents";
import { UploadForm } from "@/components/daycare/UploadForm";
import { UploadedEventsTable } from "@/components/daycare/UploadedEventsTable";

function currentMonth(): string {
  return localMonthKey();
}

export default function DaycarePage() {
  const [kid, setKid] = useState("Jake");
  const [month, setMonth] = useState(currentMonth());
  const [events, setEvents] = useState<UploadedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    return subscribeUploadedEvents(
      kid,
      month,
      (data) => {
        setEvents(data);
        setLoading(false);
      },
      () => {
        setError("Couldn't load parsed events.");
        setLoading(false);
      },
    );
  }, [kid, month]);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-gray-500">
        Upload Jake&apos;s monthly daycare calendar to have dress-up days and other flagged days
        parsed automatically and matched against the rules below.
      </p>

      <UploadForm
        kid={kid}
        month={month}
        onKidChange={setKid}
        onMonthChange={setMonth}
        onParsed={(count) => setNotice(`Parsed ${count} event${count === 1 ? "" : "s"} — review below.`)}
      />

      {notice && <p className="rounded bg-gray-100 px-3 py-2 text-sm text-gray-700">{notice}</p>}
      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && <UploadedEventsTable events={events} />}
    </div>
  );
}
