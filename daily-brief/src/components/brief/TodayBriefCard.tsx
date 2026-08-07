import {
  AlertTriangle,
  CalendarDays,
  ChefHat,
  ClipboardList,
  Circle,
  CloudSun,
  Plane,
  Shirt,
  Soup,
  UtensilsCrossed,
} from "lucide-react";
import { Fragment } from "react";
import type { DailyBriefDoc, MatchedActionDoc } from "@/lib/firestore/dailyBriefs";
import { Widget } from "./Widget";

interface TodayBriefCardProps {
  brief: DailyBriefDoc | null;
  loading?: boolean;
  error?: string | null;
}

const SOURCE_LABEL: Record<string, string> = {
  recurring: "Recurring",
  calendar: "Calendar",
  "uploaded-calendar": "Daycare",
};

function formatDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function actionsForItem(itemId: string, actions: MatchedActionDoc[]) {
  return actions.filter((a) => a.item.id === itemId);
}

export function TodayBriefCard({ brief, loading, error }: TodayBriefCardProps) {
  if (loading) {
    return <p className="px-1 text-sm text-gray-500">Loading…</p>;
  }
  if (error) {
    return <p className="px-1 text-sm text-red-600">{error}</p>;
  }
  if (!brief) {
    return (
      <p className="px-1 text-sm text-gray-500">
        No brief yet for today. The ingestion job runs at 5am — if it&apos;s already past that
        and nothing&apos;s here, check that it&apos;s deployed and connected.
      </p>
    );
  }

  const highlights = [
    brief.prepAheadNote && { icon: AlertTriangle, text: brief.prepAheadNote },
    brief.travelNote && { icon: Plane, text: brief.travelNote },
  ].filter((h): h is { icon: typeof AlertTriangle; text: string } => !!h);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Today&apos;s Brief</h2>
          <p className="text-sm text-gray-500">{formatDate(brief.date)}</p>
        </div>
        {brief.weatherNote && (
          <span className="flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700">
            <CloudSun size={14} />
            {brief.weatherNote}
          </span>
        )}
      </div>

      {highlights.length > 0 && (
        <div className="flex flex-col gap-2">
          {highlights.map((h, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900"
            >
              <h.icon size={16} className="mt-0.5 shrink-0" />
              <span>{h.text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Widget icon={CalendarDays} title="Today's Schedule" accent="blue">
          {brief.scheduleItems.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing on the schedule today.</p>
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
                      <span className="shrink-0 text-xs text-gray-400">
                        {SOURCE_LABEL[item.source] ?? item.source}
                      </span>
                    </div>
                    {itemActions.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {itemActions.map((a, i) => (
                          <Fragment key={i}>
                            {a.rule.wearNote && (
                              <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                <Shirt size={11} /> {a.rule.wearNote}
                              </span>
                            )}
                            {a.rule.dinnerFlag && (
                              <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700">
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

        <Widget icon={ChefHat} title="Dinner Tonight" accent="orange">
          {brief.dinnerTonight ? (
            <div className="flex flex-col gap-1.5 text-sm">
              <p className="flex items-center gap-1.5 font-medium text-gray-900">
                <Soup size={14} className="shrink-0 text-orange-500" />
                {brief.dinnerTonight.meal}
              </p>
              {(brief.dinnerTonight.time_minutes > 0 || brief.dinnerTonight.prep_type) && (
                <p className="text-xs text-gray-400">
                  {brief.dinnerTonight.time_minutes > 0 ? `${brief.dinnerTonight.time_minutes} min` : ""}
                  {brief.dinnerTonight.prep_type ? ` · ${brief.dinnerTonight.prep_type}` : ""}
                </p>
              )}
              {brief.dinnerTonight.kid_version && (
                <p className="text-gray-600">Kids: {brief.dinnerTonight.kid_version}</p>
              )}
              {brief.dinnerTonight.adult_lighter_option && (
                <p className="text-gray-600">Adults (lighter): {brief.dinnerTonight.adult_lighter_option}</p>
              )}
              {brief.dinnerTonight.recipeUrl && (
                <a
                  href={brief.dinnerTonight.recipeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  View recipe
                </a>
              )}
              {!brief.dinnerTonight.recipeUrl &&
                ((brief.dinnerTonight.recipeImageUrls?.length ?? 0) > 0 ||
                  brief.dinnerTonight.recipeInstructions) && (
                  <p className="text-xs text-gray-400">See recipe on the Meals page</p>
                )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No dinner planned yet — see the Meals page.</p>
          )}
        </Widget>

        <Widget icon={ClipboardList} title="Forms & Outstanding" accent="green">
          {brief.openTasks.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing outstanding.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {brief.openTasks.map((task) => (
                <li key={task.id} className="flex items-start gap-2 text-sm">
                  <Circle size={14} className="mt-0.5 shrink-0 text-gray-300" />
                  <span>
                    {task.title}
                    {task.dueDate && <span className="text-gray-400"> — due {task.dueDate}</span>}
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
