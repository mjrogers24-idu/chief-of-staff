import { Shirt, UtensilsCrossed } from "lucide-react";
import { Fragment } from "react";
import type { ScheduleItem } from "@/lib/ruleMatcher";
import type { MatchedAction } from "@/lib/schedule";

const SOURCE_LABEL: Record<string, string> = {
  recurring: "Recurring",
  calendar: "Calendar",
  "uploaded-calendar": "Daycare",
};

function actionsForItem(itemId: string, actions: MatchedAction[]) {
  return actions.filter((a) => a.item.id === itemId);
}

interface ScheduleItemsListProps {
  items: ScheduleItem[];
  actions: MatchedAction[];
  emptyLabel?: string;
}

/** Shared with TodayBriefCard's "Today's Schedule" widget and the /admin/schedule-view day browser. */
export function ScheduleItemsList({ items, actions, emptyLabel = "Nothing on the schedule." }: ScheduleItemsListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => {
        const itemActions = actionsForItem(item.id, actions);
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
  );
}
