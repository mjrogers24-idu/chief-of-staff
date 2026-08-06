"use client";

import { useEffect, useState } from "react";
import { subscribeDailyBrief, todayDateKey, type DailyBriefDoc } from "@/lib/firestore/dailyBriefs";
import { TodayBriefCard } from "@/components/brief/TodayBriefCard";

export default function TodayPage() {
  const [brief, setBrief] = useState<DailyBriefDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return <TodayBriefCard brief={brief} loading={loading} error={error} />;
}
