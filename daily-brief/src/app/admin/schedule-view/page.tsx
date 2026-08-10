"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { ScheduleItemsList } from "@/components/schedule/ScheduleItemsList";
import { addDays, localDateKey, parseDateKey } from "@/lib/dates";
import { getScheduleForDate, type DaySchedule } from "@/lib/schedule";

function formatDate(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function ScheduleViewPage() {
  const [date, setDate] = useState(localDateKey());
  const [data, setData] = useState<DaySchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getScheduleForDate(date)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load the schedule for that day.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  function shiftDay(delta: number) {
    setDate(localDateKey(addDays(parseDateKey(date), delta)));
  }

  const isToday = date === localDateKey();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <button
          onClick={() => shiftDay(-1)}
          aria-label="Previous day"
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{formatDate(date)}</h2>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="rounded border border-gray-300 bg-transparent px-1.5 py-0.5 text-xs text-gray-500 dark:border-gray-600 dark:text-gray-400"
            />
            {!isToday && (
              <button
                onClick={() => setDate(localDateKey())}
                className="text-xs font-medium text-brand-600 underline dark:text-brand-400"
              >
                Today
              </button>
            )}
          </div>
        </div>
        <button
          onClick={() => shiftDay(1)}
          aria-label="Next day"
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {data && !loading && !error && (
          <ScheduleItemsList
            items={data.scheduleItems}
            actions={data.actions}
            emptyLabel="Nothing on the schedule this day."
          />
        )}
      </div>
    </div>
  );
}
