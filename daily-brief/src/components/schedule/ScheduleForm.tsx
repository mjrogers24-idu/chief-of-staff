"use client";

import { useState, type FormEvent } from "react";
import {
  WEEKDAYS,
  type RecurringScheduleInput,
  type Weekday,
} from "@/lib/firestore/recurringSchedule";

const EMPTY: RecurringScheduleInput = { kid: "", label: "", daysOfWeek: [], note: null };

interface ScheduleFormProps {
  initialValue?: RecurringScheduleInput;
  onSubmit: (input: RecurringScheduleInput) => Promise<void>;
  onCancel: () => void;
}

export function ScheduleForm({ initialValue, onSubmit, onCancel }: ScheduleFormProps) {
  const [values, setValues] = useState<RecurringScheduleInput>(initialValue ?? EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(day: Weekday) {
    setValues((v) => ({
      ...v,
      daysOfWeek: v.daysOfWeek.includes(day)
        ? v.daysOfWeek.filter((d) => d !== day)
        : [...v.daysOfWeek, day],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values.kid.trim() || !values.label.trim()) {
      setError("Kid and label are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        kid: values.kid.trim(),
        label: values.label.trim(),
        daysOfWeek: values.daysOfWeek,
        note: values.note?.trim() || null,
      });
    } catch {
      setError("Couldn't save. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Kid *
          <input
            value={values.kid}
            onChange={(e) => setValues((v) => ({ ...v, kid: e.target.value }))}
            className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
            placeholder="e.g. Josh"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Label *
          <input
            value={values.label}
            onChange={(e) => setValues((v) => ({ ...v, label: e.target.value }))}
            className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
            placeholder="e.g. PE, Lunch, Specials"
            required
          />
        </label>
      </div>

      <div className="flex flex-col gap-1 text-sm">
        Days (leave blank for every day)
        <div className="flex gap-2">
          {WEEKDAYS.map((day) => (
            <button
              type="button"
              key={day}
              onClick={() => toggleDay(day)}
              className={`rounded border px-2 py-1 text-xs ${
                values.daysOfWeek.includes(day)
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Note (optional)
        <input
          value={values.note ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, note: e.target.value }))}
          className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
          placeholder="e.g. lunch at 11:40, art/music/PE rotation"
        />
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
