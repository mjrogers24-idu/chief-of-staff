"use client";

import { useEffect, useState } from "react";
import {
  currentWeekStart,
  generateMealPlan,
  subscribeMealPlan,
  type MealPlanDoc,
} from "@/lib/firestore/mealPlans";
import { MealPlanCard } from "@/components/meals/MealPlanCard";

export default function MealsPage() {
  const [plan, setPlan] = useState<MealPlanDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    return subscribeMealPlan(
      currentWeekStart(),
      (data) => {
        setPlan(data);
        setLoading(false);
      },
      () => {
        setError("Couldn't load this week's plan.");
        setLoading(false);
      },
    );
  }, []);

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

  return (
    <MealPlanCard
      plan={plan}
      loading={loading}
      error={error}
      generating={generating}
      onGenerate={handleGenerate}
    />
  );
}
