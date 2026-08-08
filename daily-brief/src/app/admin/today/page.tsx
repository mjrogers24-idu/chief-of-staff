"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { subscribeDailyBrief, todayDateKey, type DailyBriefDoc } from "@/lib/firestore/dailyBriefs";
import { subscribeEmailFollowUps } from "@/lib/firestore/emailFollowUps";
import { currentWeekStart, mealForDate, subscribeMealPlan, type MealDay, type MealPlanDoc } from "@/lib/firestore/mealPlans";
import { subscribeOpenTasks, type OpenTask } from "@/lib/firestore/openTasks";
import { TodayBriefCard } from "@/components/brief/TodayBriefCard";

export default function TodayPage() {
  const { user } = useAuth();
  const [brief, setBrief] = useState<DailyBriefDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followUpCount, setFollowUpCount] = useState(0);

  // dailyIngestion only bakes dailyBriefs once a day, so a same-day edit to
  // the meal plan or task list wouldn't otherwise show up here until the
  // next run. These two pieces are cheap to subscribe to directly, so they
  // override the cached snapshot live; the rest (weather/prep-ahead/travel/
  // schedule) genuinely need the ingestion job's own data (calendar fetch,
  // tomorrow's brief) and aren't duplicated here.
  const [mealPlan, setMealPlan] = useState<MealPlanDoc | null>(null);
  const [mealPlanLoaded, setMealPlanLoaded] = useState(false);
  const [openTasks, setOpenTasks] = useState<OpenTask[] | null>(null);

  useEffect(() => {
    return subscribeDailyBrief(
      todayDateKey(),
      (data) => {
        setBrief(data);
        setLoading(false);
      },
      () => {
        setError("Couldn't load today's brief.");
        setLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    return subscribeMealPlan(
      currentWeekStart(),
      (data) => {
        setMealPlan(data);
        setMealPlanLoaded(true);
      },
      () => setMealPlanLoaded(true),
    );
  }, []);

  useEffect(() => {
    return subscribeOpenTasks(
      (tasks) => setOpenTasks(tasks),
      () => setOpenTasks(null),
    );
  }, []);

  useEffect(() => {
    return subscribeEmailFollowUps(
      (suggestions) => setFollowUpCount(suggestions.length),
      () => setFollowUpCount(0),
    );
  }, []);

  const liveDinner: MealDay | null | undefined = mealPlanLoaded
    ? mealForDate(mealPlan, new Date())
    : undefined;
  const liveOpenTasks = openTasks
    ?.filter((t) => !t.done)
    .map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate }));

  const displayBrief: DailyBriefDoc | null = brief && {
    ...brief,
    ...(liveDinner !== undefined ? { dinnerTonight: liveDinner } : {}),
    ...(liveOpenTasks ? { openTasks: liveOpenTasks } : {}),
  };

  return (
    <TodayBriefCard
      brief={displayBrief}
      mealPlan={mealPlan}
      displayName={user?.displayName}
      followUpCount={followUpCount}
      loading={loading}
      error={error}
    />
  );
}
