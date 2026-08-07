"use client";

import { useEffect, useState } from "react";
import {
  currentWeekStart,
  deleteMealDay,
  generateMealPlan,
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
    } catch {
      setError("Couldn't generate a plan. Try again.");
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
        <MealPlanCard
          plan={plan}
          loading={loading}
          error={error}
          generating={generating}
          onGenerate={handleGenerate}
          onAddDay={() => setFormMode({ kind: "add" })}
          onEditDay={(day) => setFormMode({ kind: "edit", day })}
          onDeleteDay={handleDeleteDay}
        />
      )}
    </div>
  );
}
