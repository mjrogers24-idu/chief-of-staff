"use client";

import { useEffect, useState } from "react";
import {
  addRecurringScheduleItem,
  deleteRecurringScheduleItem,
  STARTER_RECURRING_SCHEDULE,
  subscribeRecurringSchedule,
  updateRecurringScheduleItem,
  type RecurringScheduleInput,
  type RecurringScheduleItem,
} from "@/lib/firestore/recurringSchedule";
import { ScheduleForm } from "@/components/schedule/ScheduleForm";
import { ScheduleTable } from "@/components/schedule/ScheduleTable";
import { BriefPreview } from "@/components/schedule/BriefPreview";

type FormMode = { kind: "add" } | { kind: "edit"; item: RecurringScheduleItem } | null;

export default function SchedulePage() {
  const [items, setItems] = useState<RecurringScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    return subscribeRecurringSchedule(
      (data) => {
        setItems(data);
        setLoading(false);
      },
      () => {
        setError("Couldn't load the schedule.");
        setLoading(false);
      },
    );
  }, []);

  async function handleAdd(input: RecurringScheduleInput) {
    await addRecurringScheduleItem(input);
    setFormMode(null);
  }

  async function handleUpdate(id: string, input: RecurringScheduleInput) {
    await updateRecurringScheduleItem(id, input);
    setFormMode(null);
  }

  async function handleDelete(item: RecurringScheduleItem) {
    if (!confirm(`Delete "${item.kid} — ${item.label}"?`)) return;
    await deleteRecurringScheduleItem(item.id);
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      await Promise.all(STARTER_RECURRING_SCHEDULE.map((item) => addRecurringScheduleItem(item)));
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Recurring weekly schedule per kid — gym days, lunch times, specials rotation.
        </p>
        {!formMode && (
          <button
            onClick={() => setFormMode({ kind: "add" })}
            className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            Add item
          </button>
        )}
      </div>

      {formMode?.kind === "add" && (
        <ScheduleForm onSubmit={handleAdd} onCancel={() => setFormMode(null)} />
      )}
      {formMode?.kind === "edit" && (
        <ScheduleForm
          initialValue={formMode.item}
          onSubmit={(input) => handleUpdate(formMode.item.id, input)}
          onCancel={() => setFormMode(null)}
        />
      )}

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <>
          {items.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="self-start rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              {seeding ? "Loading starter schedule…" : "Load starter schedule"}
            </button>
          )}
          <ScheduleTable
            items={items}
            onEdit={(item) => setFormMode({ kind: "edit", item })}
            onDelete={handleDelete}
          />
          <BriefPreview scheduleItems={items} />
        </>
      )}
    </div>
  );
}
