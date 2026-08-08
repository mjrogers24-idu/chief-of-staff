"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import { confirmEmailFollowUp, dismissEmailFollowUp, type EmailFollowUpSuggestion } from "@/lib/firestore/emailFollowUps";

interface SuggestedFollowUpsProps {
  suggestions: EmailFollowUpSuggestion[];
}

export function SuggestedFollowUps({ suggestions }: SuggestedFollowUpsProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  if (suggestions.length === 0) return null;

  async function handleConfirm(suggestion: EmailFollowUpSuggestion) {
    setBusyId(suggestion.id);
    try {
      await confirmEmailFollowUp(suggestion);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDismiss(id: string) {
    setBusyId(id);
    try {
      await dismissEmailFollowUp(id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-violet-100 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-900/20">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">
          <Mail size={16} strokeWidth={2.25} />
        </span>
        <h3 className="text-sm font-semibold text-violet-900 dark:text-violet-200">
          Suggested follow-ups ({suggestions.length})
        </h3>
      </div>
      <p className="text-xs text-violet-800 dark:text-violet-300">
        From this morning&apos;s inbox scan — review each before it becomes a task.
      </p>
      <div className="flex flex-col gap-2">
        {suggestions.map((s) => (
          <div key={s.id} className="rounded-xl bg-white p-3 text-sm dark:bg-gray-800">
            <p className="font-medium text-gray-900 dark:text-gray-100">{s.subject || "(no subject)"}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.from}</p>
            <p className="mt-1 text-gray-600 dark:text-gray-400">{s.reason}</p>
            <div className="mt-2 flex gap-3">
              <button
                onClick={() => handleConfirm(s)}
                disabled={busyId === s.id}
                className="text-xs font-medium text-brand-600 underline disabled:opacity-50 dark:text-brand-400"
              >
                Add as task
              </button>
              <button
                onClick={() => handleDismiss(s.id)}
                disabled={busyId === s.id}
                className="text-xs text-gray-500 underline disabled:opacity-50 dark:text-gray-400"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
