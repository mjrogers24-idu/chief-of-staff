"use client";

import { useEffect, useState } from "react";
import { subscribeBriefRules, type BriefRule } from "@/lib/firestore/briefRules";
import { scheduleForDate, type RecurringScheduleItem } from "@/lib/firestore/recurringSchedule";
import { matchBriefRules, type MatchedAction, type ScheduleItem } from "@/lib/ruleMatcher";

interface BriefPreviewProps {
  scheduleItems: RecurringScheduleItem[];
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function previewFor(date: Date, scheduleItems: RecurringScheduleItem[], rules: BriefRule[]) {
  const items: ScheduleItem[] = scheduleForDate(scheduleItems, date).map((item) => ({
    id: item.id,
    title: item.label,
    date: toDateKey(date),
    kid: item.kid,
    source: "recurring",
  }));
  return matchBriefRules(items, rules);
}

/**
 * Shows what the daily ingestion job (spec 3.2) would flag today and
 * tomorrow, using only the recurring schedule — lets Michelle sanity-check
 * the rules engine without waiting on Google Calendar or a deployed
 * Cloud Function.
 */
export function BriefPreview({ scheduleItems }: BriefPreviewProps) {
  const [rules, setRules] = useState<BriefRule[]>([]);

  useEffect(() => {
    return subscribeBriefRules(setRules, () => setRules([]));
  }, []);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const days: { label: string; matches: MatchedAction[] }[] = [
    { label: "Today", matches: previewFor(today, scheduleItems, rules) },
    { label: "Tomorrow", matches: previewFor(tomorrow, scheduleItems, rules) },
  ];

  return (
    <div className="flex flex-col gap-4 rounded border border-gray-200 p-4">
      <h2 className="text-sm font-medium text-gray-700">
        Brief preview <span className="font-normal text-gray-400">(recurring schedule only)</span>
      </h2>
      {days.map((day) => (
        <div key={day.label}>
          <h3 className="text-xs font-semibold uppercase text-gray-400">{day.label}</h3>
          {day.matches.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing flagged.</p>
          ) : (
            <ul className="mt-1 flex flex-col gap-1 text-sm">
              {day.matches.map((match, i) => (
                <li key={i}>
                  <span className="font-medium">{match.item.kid ?? "Family"}</span>
                  {" — "}
                  {match.item.title}
                  {match.rule.wearNote && `: wear ${match.rule.wearNote}`}
                  {match.rule.dinnerFlag && ` (dinner: ${match.rule.dinnerFlag})`}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
