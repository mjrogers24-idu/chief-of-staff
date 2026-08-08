"use client";

import { useState, type FormEvent } from "react";
import type { BriefRuleInput } from "@/lib/firestore/briefRules";

const EMPTY: BriefRuleInput = { keyword: "", kid: null, wearNote: null, dinnerFlag: null };

interface RuleFormProps {
  initialValue?: BriefRuleInput;
  onSubmit: (input: BriefRuleInput) => Promise<void>;
  onCancel: () => void;
}

export function RuleForm({ initialValue, onSubmit, onCancel }: RuleFormProps) {
  const [values, setValues] = useState<BriefRuleInput>(initialValue ?? EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values.keyword.trim()) {
      setError("Keyword is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        keyword: values.keyword.trim(),
        kid: values.kid?.trim() || null,
        wearNote: values.wearNote?.trim() || null,
        dinnerFlag: values.dinnerFlag?.trim() || null,
      });
    } catch {
      setError("Couldn't save the rule. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Keyword *
          <input
            value={values.keyword}
            onChange={(e) => setValues((v) => ({ ...v, keyword: e.target.value }))}
            className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
            placeholder="e.g. PE"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Kid (optional)
          <input
            value={values.kid ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, kid: e.target.value }))}
            className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
            placeholder="e.g. Josh — blank applies to any kid"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Wear note (optional)
          <input
            value={values.wearNote ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, wearNote: e.target.value }))}
            className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
            placeholder="e.g. sneakers, athletic clothes"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Dinner flag (optional)
          <input
            value={values.dinnerFlag ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, dinnerFlag: e.target.value }))}
            className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
            placeholder="e.g. quick-prep"
          />
        </label>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
