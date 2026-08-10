"use client";

import { CalendarDays, ChefHat, ClipboardList, type LucideIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import {
  confirmEventProposal,
  confirmMealProposal,
  confirmTaskProposal,
  weekdayLabelFor,
  type BrainDumpProposals,
  type EventProposal,
  type MealProposal,
  type TaskProposal,
} from "@/lib/brainDump";

interface BrainDumpReviewProps {
  proposals: BrainDumpProposals;
}

interface SectionProps<T> {
  icon: LucideIcon;
  title: string;
  items: T[];
  renderFields: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  confirm: (item: T) => Promise<unknown>;
  disabledReason?: (item: T) => string | null;
}

/** One category's list of editable proposal cards — confirming or discarding just removes it from this local list. */
function ProposalSection<T>({ icon: Icon, title, items: initialItems, renderFields, confirm, disabledReason }: SectionProps<T>) {
  const [items, setItems] = useState(initialItems.map((item, i) => ({ id: i, item, error: null as string | null })));
  const [busyId, setBusyId] = useState<number | null>(null);
  const [addingAll, setAddingAll] = useState(false);

  if (items.length === 0) return null;

  const addableCount = items.filter((row) => !disabledReason?.(row.item)).length;

  function update(id: number, patch: Partial<T>) {
    setItems((prev) => prev.map((row) => (row.id === id ? { ...row, item: { ...row.item, ...patch } } : row)));
  }

  async function handleConfirm(id: number, item: T) {
    setBusyId(id);
    try {
      await confirm(item);
      setItems((prev) => prev.filter((row) => row.id !== id));
    } catch {
      setItems((prev) => prev.map((row) => (row.id === id ? { ...row, error: "Couldn't save — try again." } : row)));
    } finally {
      setBusyId(null);
    }
  }

  async function handleAddAll() {
    setAddingAll(true);
    for (const row of items) {
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
            {title} ({items.length})
          </h3>
        </div>
        {addableCount > 1 && (
          <button
            onClick={handleAddAll}
            disabled={addingAll || busyId !== null}
            className="text-xs font-medium text-brand-700 underline disabled:opacity-50 dark:text-brand-300"
          >
            {addingAll ? "Adding…" : "Add all"}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {items.map(({ id, item, error }) => {
          const blocked = disabledReason?.(item) ?? null;
          return (
            <div key={id} className="rounded-xl bg-white p-3 dark:bg-gray-800">
              <div className="flex flex-col gap-2">{renderFields(item, (patch) => update(id, patch))}</div>
              {blocked && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{blocked}</p>}
              {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
              <div className="mt-2 flex gap-3">
                <button
                  onClick={() => handleConfirm(id, item)}
                  disabled={busyId === id || !!blocked || addingAll}
                  className="text-xs font-medium text-brand-600 underline disabled:opacity-50 dark:text-brand-400"
                >
                  {busyId === id ? "Saving…" : "Add"}
                </button>
                <button
                  onClick={() => setItems((prev) => prev.filter((row) => row.id !== id))}
                  disabled={busyId === id || addingAll}
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

export function BrainDumpReview({ proposals }: BrainDumpReviewProps) {
  const foundNothing = proposals.tasks.length === 0 && proposals.events.length === 0 && proposals.meals.length === 0;

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
        items={proposals.tasks}
        confirm={confirmTaskProposal}
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
      <ProposalSection<EventProposal>
        icon={CalendarDays}
        title="Calendar events"
        items={proposals.events}
        confirm={confirmEventProposal}
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
          </>
        )}
      />
      <ProposalSection<MealProposal>
        icon={ChefHat}
        title="Dinner plans"
        items={proposals.meals}
        confirm={confirmMealProposal}
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
