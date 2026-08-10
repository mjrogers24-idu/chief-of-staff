"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { parseBrainDump, type BrainDumpProposals } from "@/lib/brainDump";
import { BrainDumpReview } from "./BrainDumpReview";

const PLACEHOLDER =
  "Ramble away — e.g. \"need to call the dentist for Jake, tacos would be good thursday, " +
  "and don't forget Ella's practice moved to 5:30 on tuesday\"";

export function BrainDumpChat() {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Keyed so BrainDumpReview remounts with a fresh internal list each time — otherwise its
  // per-item useState would keep showing the previous round's already-handled items.
  const [round, setRound] = useState<{ key: number; proposals: BrainDumpProposals } | null>(null);

  async function handleSubmit() {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const proposals = await parseBrainDump(text);
      setRound((prev) => ({ key: (prev?.key ?? 0) + 1, proposals }));
      setText("");
    } catch {
      setError("Couldn't organize that. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={5}
          className="resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={submitting || !text.trim()}
          className="flex items-center justify-center gap-1.5 self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Sparkles size={15} />
          {submitting ? "Organizing…" : "Organize this"}
        </button>
      </div>

      {round && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-gray-500 dark:text-gray-400">Review before adding — nothing is saved yet.</p>
            <button
              onClick={() => setRound(null)}
              className="text-xs font-medium text-gray-500 underline dark:text-gray-400"
            >
              Clear
            </button>
          </div>
          <BrainDumpReview key={round.key} proposals={round.proposals} />
        </div>
      )}
    </div>
  );
}
