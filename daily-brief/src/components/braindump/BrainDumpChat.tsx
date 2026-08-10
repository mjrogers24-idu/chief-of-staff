"use client";

import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import { parseBrainDump, type BrainDumpProposals } from "@/lib/brainDump";
import { BrainDumpReview } from "./BrainDumpReview";

const PLACEHOLDER =
  "Ramble away — e.g. \"need to call the dentist for Jake, tacos would be good thursday, " +
  "and don't forget Ella's practice moved to 5:30 on tuesday\"";

interface Turn {
  id: number;
  text: string;
  proposals: BrainDumpProposals;
}

export function BrainDumpChat() {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Newest first, so the response to what you just typed shows up right below the
  // composer instead of requiring a scroll down past every earlier turn.
  const [turns, setTurns] = useState<Turn[]>([]);
  const [nextId, setNextId] = useState(1);

  async function handleSubmit() {
    if (!text.trim() || submitting) return;
    const submittedText = text.trim();
    setSubmitting(true);
    setError(null);
    try {
      const proposals = await parseBrainDump(submittedText);
      setTurns((prev) => [{ id: nextId, text: submittedText, proposals }, ...prev]);
      setNextId((n) => n + 1);
      setText("");
    } catch {
      setError("Couldn't organize that. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={4}
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

      {turns.length > 0 && (
        <div className="flex flex-col gap-5">
          {turns.map((turn) => (
            <div key={turn.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-end gap-1.5">
                <p className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-600 px-3 py-2 text-sm text-white">
                  {turn.text}
                </p>
                <button
                  onClick={() => setTurns((prev) => prev.filter((t) => t.id !== turn.id))}
                  aria-label="Dismiss"
                  className="mt-1 shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <X size={14} />
                </button>
              </div>
              <BrainDumpReview proposals={turn.proposals} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
