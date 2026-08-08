"use client";

import { useState, type FormEvent } from "react";
import type { OpenTaskInput } from "@/lib/firestore/openTasks";

const EMPTY: OpenTaskInput = { title: "", dueDate: null };

interface TaskFormProps {
  initialValue?: OpenTaskInput;
  onSubmit: (input: OpenTaskInput) => Promise<void>;
  onCancel: () => void;
}

export function TaskForm({ initialValue, onSubmit, onCancel }: TaskFormProps) {
  const [values, setValues] = useState<OpenTaskInput>(initialValue ?? EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values.title.trim()) {
      setError("Title is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ title: values.title.trim(), dueDate: values.dueDate || null });
    } catch {
      setError("Couldn't save. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded border border-gray-200 bg-gray-50 p-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Title *
          <input
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            className="rounded border border-gray-300 px-2 py-1"
            placeholder="e.g. Field trip permission slip"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Due date (optional)
          <input
            type="date"
            value={values.dueDate ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, dueDate: e.target.value || null }))}
            className="rounded border border-gray-300 px-2 py-1"
          />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="rounded px-3 py-1.5 text-sm text-gray-600">
          Cancel
        </button>
      </div>
    </form>
  );
}
