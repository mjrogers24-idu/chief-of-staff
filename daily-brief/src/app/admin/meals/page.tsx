"use client";

import { useEffect, useState } from "react";
import {
  currentWeekStart,
  deleteMealDay,
  generateMealPlan,
  repeatMealDayNextWeek,
  subscribeMealPlan,
  upsertMealDay,
  type MealDay,
  type MealPlanDoc,
} from "@/lib/firestore/mealPlans";
import { MealDayForm } from "@/components/meals/MealDayForm";
import { MealPlanCard } from "@/components/meals/MealPlanCard";

type FormMode = { kind: "add" } | { kind: "edit"; day: MealDay } | null;

export default function MealsPage() {
  const [plan, setPlan] = useState<MealPlanDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [repeatingDay, setRepeatingDay] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const weekStart = currentWeekStart();

  useEffect(() => {
    return subscribeMealPlan(
      weekStart,
      (data) => {
        setPlan(data);
        setLoading(false);
      },
      () => {
        setError("Couldn't load this week's plan.");
        setLoading(false);
      },
    );
  }, [weekStart]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      await generateMealPlan();
    } catch (err) {
      // The Cloud Function now distinguishes "couldn't reach the AI" from
      // "got a response but couldn't parse it" — show that instead of a
      // generic message when the callable SDK gives us one.
      const message = err instanceof Error && err.message ? err.message : "Couldn't generate a plan. Try again.";
      setError(message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveDay(day: MealDay) {
    await upsertMealDay(weekStart, day);
    setFormMode(null);
  }

  async function handleDeleteDay(day: MealDay) {
    if (!confirm(`Delete ${day.day}'s dinner (${day.meal})?`)) return;
    await deleteMealDay(weekStart, day.day);
  }

  async function handleRepeatDay(day: MealDay) {
    setRepeatingDay(day.day);
    setNotice(null);
    try {
      await repeatMealDayNextWeek(day);
      setNotice(`Added "${day.meal}" to next week's ${day.day}.`);
    } catch {
      setError("Couldn't add that to next week. Try again.");
    } finally {
      setRepeatingDay(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {formMode?.kind === "add" && (
        <MealDayForm weekStart={weekStart} onSubmit={handleSaveDay} onCancel={() => setFormMode(null)} />
      )}
      {formMode?.kind === "edit" && (
        <MealDayForm
          initialValue={formMode.day}
          lockDay
          weekStart={weekStart}
          onSubmit={handleSaveDay}
          onCancel={() => setFormMode(null)}
        />
      )}

      {!formMode && (
        <>
          {notice && (
            <p className="rounded bg-sage-100 px-3 py-2 text-sm text-sage-800 dark:bg-sage-900/30 dark:text-sage-300">
              {notice}
            </p>
          )}
          <MealPlanCard
            plan={plan}
            loading={loading}
            error={error}
            generating={generating}
            repeatingDay={repeatingDay}
            onGenerate={handleGenerate}
            onAddDay={() => setFormMode({ kind: "add" })}
            onEditDay={(day) => setFormMode({ kind: "edit", day })}
            onDeleteDay={handleDeleteDay}
            onRepeatDay={handleRepeatDay}
          />
        </>
      )}
    </div>
  );
}
