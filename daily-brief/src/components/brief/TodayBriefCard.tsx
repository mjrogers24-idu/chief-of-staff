import type { DailyBriefDoc } from "@/lib/firestore/dailyBriefs";

interface TodayBriefCardProps {
  brief: DailyBriefDoc | null;
  loading?: boolean;
  error?: string | null;
}

const SOURCE_LABEL: Record<string, string> = {
  recurring: "Recurring",
  calendar: "Calendar",
  "uploaded-calendar": "Daycare calendar",
};

function formatDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function TodayBriefCard({ brief, loading, error }: TodayBriefCardProps) {
  return (
    <div className="flex flex-col gap-5 rounded-lg border border-gray-200 p-5">
      <div>
        <h2 className="text-lg font-semibold">Today&apos;s Brief</h2>
        {brief && <p className="text-sm text-gray-500">{formatDate(brief.date)}</p>}
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && !brief && (
        <p className="text-sm text-gray-500">
          No brief yet for today. The ingestion job runs at 5am — if it&apos;s already past that
          and nothing&apos;s here, check that it&apos;s deployed and connected.
        </p>
      )}

      {brief && (
        <>
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase text-gray-400">Schedule</h3>
            {brief.scheduleItems.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing on the schedule today.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {brief.scheduleItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between">
                    <span>
                      {item.kid && <span className="font-medium">{item.kid} — </span>}
                      {item.title}
                    </span>
                    <span className="text-xs text-gray-400">
                      {SOURCE_LABEL[item.source] ?? item.source}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase text-gray-400">Prep reminders</h3>
            {brief.actions.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing flagged.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {brief.actions.map((action, i) => (
                  <li key={i}>
                    <span className="font-medium">{action.item.kid ?? "Family"}</span>
                    {" — "}
                    {action.item.title}
                    {action.rule.wearNote && `: wear ${action.rule.wearNote}`}
                    {action.rule.dinnerFlag && ` (dinner: ${action.rule.dinnerFlag})`}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
