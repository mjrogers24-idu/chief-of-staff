"use client";

import { CalendarDays, CheckCircle2, ChefHat, ClipboardList, type LucideIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { CalendarListEntry } from "@/lib/calendars";
import {
  confirmEventProposal,
  confirmMealProposal,
  confirmTaskProposal,
  weekdayLabelFor,
  type MealProposal,
  type ReviewEventProposal,
  type TaskProposal,
} from "@/lib/brainDump";

interface BrainDumpReviewProps {
  tasks: TaskProposal[];
  events: ReviewEventProposal[];
  meals: MealProposal[];
  calendars: CalendarListEntry[];
}

interface SectionProps<T> {
  icon: LucideIcon;
  title: string;
  items: T[];
  renderFields: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  confirm: (item: T) => Promise<unknown>;
  /** Short label for the "✓ Added" confirmation row, e.g. the item's title. */
  summaryLabel: (item: T) => string;
  disabledReason?: (item: T) => string | null;
}

type RowStatus = "pending" | "saving" | "done";

/**
 * One category's list of editable proposal cards. Confirming an item no
 * longer removes it — it flips to a "✓ Added" row so there's visible
 * feedback that it actually saved, instead of the card just vanishing.
 * Discarding still removes it outright, since nothing was ever saved.
 */
function ProposalSection<T>({
  icon: Icon,
  title,
  items: initialItems,
  renderFields,
  confirm,
  summaryLabel,
  disabledReason,
}: SectionProps<T>) {
  const [items, setItems] = useState(
    initialItems.map((item, i) => ({ id: i, item, error: null as string | null, status: "pending" as RowStatus })),
  );
  const [addingAll, setAddingAll] = useState(false);

  if (items.length === 0) return null;

  const pending = items.filter((row) => row.status === "pending");
  const addableCount = pending.filter((row) => !disabledReason?.(row.item)).length;
  const anySaving = items.some((row) => row.status === "saving");

  function update(id: number, patch: Partial<T>) {
    setItems((prev) => prev.map((row) => (row.id === id ? { ...row, item: { ...row.item, ...patch } } : row)));
  }

  async function handleConfirm(id: number, item: T) {
    setItems((prev) => prev.map((row) => (row.id === id ? { ...row, status: "saving", error: null } : row)));
    try {
      await confirm(item);
      setItems((prev) => prev.map((row) => (row.id === id ? { ...row, status: "done" } : row)));
    } catch {
      setItems((prev) =>
        prev.map((row) => (row.id === id ? { ...row, status: "pending", error: "Couldn't save — try again." } : row)),
      );
    }
  }

  async function handleAddAll() {
    setAddingAll(true);
    for (const row of pending) {
      if (disabledReason?.(row.item)) continue;
      await handleConfirm(row.id, row.item);
    }
    setAddingAll(false);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-4 dark:border-brand-900 dark:bg-brand-900/20">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
            <Icon size={16} strokeWidth={2.25} />
          </span>
          <h3 className="text-sm font-semibold text-brand-900 dark:text-brand-200">
            {title} ({pending.length})
          </h3>
        </div>
        {addableCount > 1 && (
          <button
            onClick={handleAddAll}
            disabled={addingAll || anySaving}
            className="text-xs font-medium text-brand-700 underline disabled:opacity-50 dark:text-brand-300"
          >
            {addingAll ? "Adding…" : "Add all"}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {items.map(({ id, item, error, status }) => {
          if (status === "done") {
            return (
              <div
                key={id}
                className="flex items-center gap-2 rounded-xl bg-sage-50 px-3 py-2.5 text-sm text-sage-800 dark:bg-sage-900/20 dark:text-sage-300"
              >
                <CheckCircle2 size={16} className="shrink-0" />
                <span>Added — {summaryLabel(item)}</span>
              </div>
            );
          }
          const blocked = disabledReason?.(item) ?? null;
          const saving = status === "saving";
          return (
            <div key={id} className="rounded-xl bg-white p-3 dark:bg-gray-800">
              <div className="flex flex-col gap-2">{renderFields(item, (patch) => update(id, patch))}</div>
              {blocked && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{blocked}</p>}
              {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
              <div className="mt-2 flex gap-3">
                <button
                  onClick={() => handleConfirm(id, item)}
                  disabled={saving || !!blocked || addingAll}
                  className="text-xs font-medium text-brand-600 underline disabled:opacity-50 dark:text-brand-400"
                >
                  {saving ? "Saving…" : "Add"}
                </button>
                <button
                  onClick={() => setItems((prev) => prev.filter((row) => row.id !== id))}
                  disabled={saving || addingAll}
                  className="text-xs text-gray-500 underline disabled:opacity-50 dark:text-gray-400"
                >
                  Discard
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const fieldClass =
  "rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-sm text-gray-900 dark:text-gray-100";

export function BrainDumpReview({ tasks, events, meals, calendars }: BrainDumpReviewProps) {
  const foundNothing = tasks.length === 0 && events.length === 0 && meals.length === 0;

  if (foundNothing) {
    return (
      <p className="rounded-2xl bg-gray-100 dark:bg-gray-800 p-4 text-sm text-gray-500 dark:text-gray-400">
        Didn&apos;t find anything actionable in that — try adding a bit more detail.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ProposalSection<TaskProposal>
        icon={ClipboardList}
        title="Tasks"
        items={tasks}
        confirm={confirmTaskProposal}
        summaryLabel={(item) => item.title}
        renderFields={(item, update) => (
          <>
            <input
              value={item.title}
              onChange={(e) => update({ title: e.target.value })}
              className={fieldClass}
              placeholder="Title"
            />
            <input
              type="date"
              value={item.dueDate ?? ""}
              onChange={(e) => update({ dueDate: e.target.value || null })}
              className={fieldClass}
            />
          </>
        )}
      />
      <ProposalSection<ReviewEventProposal>
        icon={CalendarDays}
        title="Calendar events"
        items={events}
        confirm={confirmEventProposal}
        summaryLabel={(item) => item.title}
        renderFields={(item, update) => (
          <>
            <input
              value={item.title}
              onChange={(e) => update({ title: e.target.value })}
              className={fieldClass}
              placeholder="Title"
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={item.date}
                onChange={(e) => update({ date: e.target.value })}
                className={fieldClass}
              />
              <input
                type="time"
                value={item.time ?? ""}
                onChange={(e) => update({ time: e.target.value || null })}
                className={fieldClass}
              />
            </div>
            <input
              value={item.location ?? ""}
              onChange={(e) => update({ location: e.target.value || null })}
              className={fieldClass}
              placeholder="Location (optional)"
            />
            <select
              value={item.calendarId}
              onChange={(e) => update({ calendarId: e.target.value })}
              className={fieldClass}
            >
              <option value="primary">
                {calendars.find((c) => c.primary)?.summary ?? "My calendar"}
              </option>
              {calendars
                .filter((c) => !c.primary)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.summary}
                  </option>
                ))}
            </select>
          </>
        )}
      />
      <ProposalSection<MealProposal>
        icon={ChefHat}
        title="Dinner plans"
        items={meals}
        confirm={confirmMealProposal}
        summaryLabel={(item) => item.meal}
        disabledReason={(item) => (weekdayLabelFor(item.date) ? null : "Weekends aren't tracked on the Meals page.")}
        renderFields={(item, update) => (
          <div className="flex gap-2">
            <input
              type="date"
              value={item.date}
              onChange={(e) => update({ date: e.target.value })}
              className={fieldClass}
            />
            <input
              value={item.meal}
              onChange={(e) => update({ meal: e.target.value })}
              className={`${fieldClass} flex-1`}
              placeholder="Meal"
            />
          </div>
        )}
      />
    </div>
  );
}
