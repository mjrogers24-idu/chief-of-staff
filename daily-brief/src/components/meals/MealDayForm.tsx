"use client";

import { useState, type FormEvent } from "react";
import { MEAL_PLAN_WEEKDAYS, type MealDay } from "@/lib/firestore/mealPlans";

const EMPTY: MealDay = {
  day: "Mon",
  meal: "",
  time_minutes: 0,
  prep_type: "",
  kid_version: "",
  adult_lighter_option: "",
  notes: "",
};

interface MealDayFormProps {
  initialValue?: MealDay;
  /** Disable changing the day (editing an existing entry keeps its weekday). */
  lockDay?: boolean;
  onSubmit: (day: MealDay) => Promise<void>;
  onCancel: () => void;
}

export function MealDayForm({ initialValue, lockDay, onSubmit, onCancel }: MealDayFormProps) {
  const [values, setValues] = useState<MealDay>(initialValue ?? EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values.meal.trim()) {
      setError("Meal is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ ...values, meal: values.meal.trim() });
    } catch {
      setError("Couldn't save. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded border border-gray-200 bg-gray-50 p-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Day
          <select
            value={values.day}
            disabled={lockDay}
            onChange={(e) => setValues((v) => ({ ...v, day: e.target.value }))}
            className="rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100"
          >
            {MEAL_PLAN_WEEKDAYS.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Meal *
          <input
            value={values.meal}
            onChange={(e) => setValues((v) => ({ ...v, meal: e.target.value }))}
            className="rounded border border-gray-300 px-2 py-1"
            placeholder="e.g. Tacos (build-your-own)"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Time (minutes)
          <input
            type="number"
            min={0}
            value={values.time_minutes || ""}
            onChange={(e) => setValues((v) => ({ ...v, time_minutes: Number(e.target.value) || 0 }))}
            className="rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Prep type
          <input
            value={values.prep_type}
            onChange={(e) => setValues((v) => ({ ...v, prep_type: e.target.value }))}
            className="rounded border border-gray-300 px-2 py-1"
            placeholder="e.g. slow-cooker"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Kids version
          <input
            value={values.kid_version}
            onChange={(e) => setValues((v) => ({ ...v, kid_version: e.target.value }))}
            className="rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Adults (lighter option)
          <input
            value={values.adult_lighter_option}
            onChange={(e) => setValues((v) => ({ ...v, adult_lighter_option: e.target.value }))}
            className="rounded border border-gray-300 px-2 py-1"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Notes
        <input
          value={values.notes}
          onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
          className="rounded border border-gray-300 px-2 py-1"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="rounded px-3 py-1.5 text-sm text-gray-600">
          Cancel
        </button>
      </div>
    </form>
  );
}
