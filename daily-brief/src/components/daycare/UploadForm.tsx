"use client";

import { useRef, useState, type FormEvent } from "react";
import { uploadDaycareCalendar } from "@/lib/calendarUpload";
import { localMonthKey } from "@/lib/dates";

function currentMonth(): string {
  return localMonthKey();
}

interface UploadFormProps {
  kid: string;
  month: string;
  onKidChange: (kid: string) => void;
  onMonthChange: (month: string) => void;
  onParsed: (count: number) => void;
}

export function UploadForm({ kid, month, onKidChange, onMonthChange, onParsed }: UploadFormProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const file = fileInput.current?.files?.[0];
    if (!file) {
      setError("Choose an image or PDF first.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const result = await uploadDaycareCalendar(file, kid, month);
      onParsed(result.events.length);
      if (fileInput.current) fileInput.current.value = "";
    } catch {
      setError("Couldn't parse that calendar. Try a clearer photo, or a different file.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border border-gray-200 dark:border-gray-700 p-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Kid
          <input
            value={kid}
            onChange={(e) => onKidChange(e.target.value)}
            className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Month
          <input
            type="month"
            value={month || currentMonth()}
            onChange={(e) => onMonthChange(e.target.value)}
            className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Calendar image or PDF
        <input
          ref={fileInput}
          type="file"
          accept="image/*,application/pdf"
          className="text-sm"
        />
      </label>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={uploading}
        className="self-start rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {uploading ? "Uploading & parsing…" : "Upload & parse"}
      </button>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Re-uploading for the same kid and month replaces whatever was parsed there before.
      </p>
    </form>
  );
}
