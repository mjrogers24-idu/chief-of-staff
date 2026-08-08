import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Circle,
  CloudSun,
  Mail,
  Plane,
  Shirt,
  Soup,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import type { DailyBriefDoc, MatchedActionDoc } from "@/lib/firestore/dailyBriefs";
import { MEAL_PLAN_WEEKDAYS, type MealPlanDoc } from "@/lib/firestore/mealPlans";
import { Widget } from "./Widget";

interface TodayBriefCardProps {
  brief: DailyBriefDoc | null;
  mealPlan?: MealPlanDoc | null;
  displayName?: string | null;
  followUpCount?: number;
  loading?: boolean;
  error?: string | null;
}

const SOURCE_LABEL: Record<string, string> = {
  recurring: "Recurring",
  calendar: "Calendar",
  "uploaded-calendar": "Daycare",
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatToday(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function actionsForItem(itemId: string, actions: MatchedActionDoc[]) {
  return actions.filter((a) => a.item.id === itemId);
}

function StatTile({ value, label, accent }: { value: string | number; label: string; accent: string }) {
  return (
    <div className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-3 ${accent}`}>
      <span className="text-xl font-semibold">{value}</span>
      <span className="text-center text-[11px] leading-tight opacity-80">{label}</span>
    </div>
  );
}

export function TodayBriefCard({
  brief,
  mealPlan,
  displayName,
  followUpCount = 0,
  loading,
  error,
}: TodayBriefCardProps) {
  const header = (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {greeting()}
          {displayName ? `, ${displayName}` : ""}!
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{formatToday()}</p>
      </div>
      {brief?.weatherNote && (
        <span className="flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
          <CloudSun size={14} />
          {brief.weatherNote}
        </span>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <p className="px-1 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <p className="px-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }
  if (!brief) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <p className="px-1 text-sm text-gray-500 dark:text-gray-400">
          No brief yet for today. The ingestion job runs at 5am — if it&apos;s already past that
          and nothing&apos;s here, check that it&apos;s deployed and connected.
        </p>
      </div>
    );
  }

  const highlights = [brief.prepAheadNote && { icon: AlertTriangle, text: brief.prepAheadNote }].filter(
    (h): h is { icon: typeof AlertTriangle; text: string } => !!h,
  );
  const openTaskCount = brief.openTasks.length;
  const allClear =
    highlights.length === 0 && !brief.travelNote && openTaskCount === 0 && followUpCount === 0;
  const dinnersPlanned = mealPlan?.days.length ?? null;

  return (
    <div className="flex flex-col gap-4">
      {header}

      <div className="flex gap-2 px-1">
        <StatTile
          value={brief.scheduleItems.length}
          label="On the schedule"
          accent="bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
        />
        <StatTile
          value={openTaskCount}
          label="Tasks open"
          accent="bg-sage-100 text-sage-800 dark:bg-sage-900/30 dark:text-sage-300"
        />
        {dinnersPlanned !== null && (
          <StatTile
            value={`${dinnersPlanned}/${MEAL_PLAN_WEEKDAYS.length}`}
            label="Dinners planned"
            accent="bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
          />
        )}
      </div>

      {allClear && (
        <div className="flex items-center gap-2 rounded-2xl bg-sage-100 p-3 text-sm text-sage-800 dark:bg-sage-900/30 dark:text-sage-300">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>All clear — nothing needs your attention today.</span>
        </div>
      )}

      {highlights.length > 0 && (
        <div className="flex flex-col gap-2">
          {highlights.map((h, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-300"
            >
              <h.icon size={16} className="mt-0.5 shrink-0" />
              <span>{h.text}</span>
            </div>
          ))}
        </div>
      )}

      {followUpCount > 0 && (
        <Link
          href="/admin/tasks"
          className="flex items-center gap-2 rounded-2xl bg-violet-50 p-3 text-sm text-violet-900 hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/40"
        >
          <Mail size={16} className="shrink-0" />
          <span>
            {followUpCount} email{followUpCount === 1 ? "" : "s"} may need a reply — review on Tasks
          </span>
        </Link>
      )}

      {brief.travelNote && (
        <div className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-900/20">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">
            <Plane size={16} strokeWidth={2.25} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-violet-900 dark:text-violet-200">Upcoming trip</h3>
            <p className="text-sm text-violet-800 dark:text-violet-300">{brief.travelNote}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Widget icon={CalendarDays} title="Today's Schedule" accent="blue">
          {brief.scheduleItems.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Nothing on the schedule today.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {brief.scheduleItems.map((item) => {
                const itemActions = actionsForItem(item.id, brief.actions);
                return (
                  <li key={item.id} className="text-sm">
                    <div className="flex items-baseline justify-between gap-2">
                      <span>
                        {item.kid && <span className="font-medium">{item.kid} — </span>}
                        {item.title}
                      </span>
                      <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                        {SOURCE_LABEL[item.source] ?? item.source}
                      </span>
                    </div>
                    {itemActions.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {itemActions.map((a, i) => (
                          <Fragment key={i}>
                            {a.rule.wearNote && (
                              <span className="flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                                <Shirt size={11} /> {a.rule.wearNote}
                              </span>
                            )}
                            {a.rule.dinnerFlag && (
                              <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                                <UtensilsCrossed size={11} /> {a.rule.dinnerFlag}
                              </span>
                            )}
                          </Fragment>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Widget>

        <Widget icon={ChefHat} title="Dinner Tonight" accent="brand">
          {brief.dinnerTonight ? (
            <div className="flex flex-col gap-1.5 text-sm">
              <p className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-gray-100">
                <Soup size={14} className="shrink-0 text-brand-500 dark:text-brand-400" />
                {brief.dinnerTonight.meal}
              </p>
              {(brief.dinnerTonight.time_minutes > 0 || brief.dinnerTonight.prep_type) && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {brief.dinnerTonight.time_minutes > 0 ? `${brief.dinnerTonight.time_minutes} min` : ""}
                  {brief.dinnerTonight.prep_type ? ` · ${brief.dinnerTonight.prep_type}` : ""}
                </p>
              )}
              {brief.dinnerTonight.kid_version && (
                <p className="text-gray-600 dark:text-gray-400">Kids: {brief.dinnerTonight.kid_version}</p>
              )}
              {brief.dinnerTonight.adult_lighter_option && (
                <p className="text-gray-600 dark:text-gray-400">Adults (lighter): {brief.dinnerTonight.adult_lighter_option}</p>
              )}
              {brief.dinnerTonight.recipeUrl && (
                <a
                  href={brief.dinnerTonight.recipeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline dark:text-blue-400"
                >
                  View recipe
                </a>
              )}
              {!brief.dinnerTonight.recipeUrl &&
                ((brief.dinnerTonight.recipeImageUrls?.length ?? 0) > 0 ||
                  brief.dinnerTonight.recipeInstructions) && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">See recipe on the Meals page</p>
                )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No dinner planned yet — see the Meals page.</p>
          )}
        </Widget>

        <Widget icon={ClipboardList} title="Forms & Outstanding" accent="sage">
          {brief.openTasks.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Nothing outstanding.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {brief.openTasks.map((task) => (
                <li key={task.id} className="flex items-start gap-2 text-sm">
                  <Circle size={14} className="mt-0.5 shrink-0 text-gray-300" />
                  <span>
                    {task.title}
                    {task.dueDate && <span className="text-gray-400 dark:text-gray-500"> — due {task.dueDate}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Widget>
      </div>
    </div>
  );
}
