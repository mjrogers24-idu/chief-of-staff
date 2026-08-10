"use client";

import { Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { parseBrainDump, type MealProposal, type ReviewEventProposal, type TaskProposal } from "@/lib/brainDump";
import { defaultCalendarIdFor, listCalendars, type CalendarListEntry } from "@/lib/calendars";
import { BrainDumpReview } from "./BrainDumpReview";

const PLACEHOLDER = "Type a message…";
const MAX_TEXTAREA_HEIGHT = 128;

interface Turn {
  id: number;
  text: string;
  tasks: TaskProposal[];
  events: ReviewEventProposal[];
  meals: MealProposal[];
}

function firstName(displayName?: string | null): string | null {
  const first = displayName?.trim().split(/\s+/)[0];
  return first || null;
}

export function BrainDumpChat() {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Chronological (oldest first) — new turns land at the bottom, right above the
  // composer, same as any texting app.
  const [turns, setTurns] = useState<Turn[]>([]);
  const [nextId, setNextId] = useState(1);
  const [calendars, setCalendars] = useState<CalendarListEntry[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const name = firstName(user?.displayName);

  useEffect(() => {
    // Best-effort — if this fails (e.g. Michelle hasn't reconnected calendar write
    // access yet), event proposals just fall back to "primary" with no dropdown options.
    listCalendars()
      .then(setCalendars)
      .catch(() => setCalendars([]));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }

  async function handleSubmit() {
    if (!text.trim() || submitting) return;
    const submittedText = text.trim();
    setSubmitting(true);
    setError(null);
    try {
      const proposals = await parseBrainDump(submittedText);
      const events: ReviewEventProposal[] = proposals.events.map((event) => ({
        ...event,
        calendarId: defaultCalendarIdFor(event.kid, calendars),
      }));
      setTurns((prev) => [
        ...prev,
        { id: nextId, text: submittedText, tasks: proposals.tasks, events, meals: proposals.meals },
      ]);
      setNextId((n) => n + 1);
      setText("");
      requestAnimationFrame(resizeTextarea);
    } catch {
      setError("Couldn't organize that. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-1.5">
        <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 px-3 py-2 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-200">
          Hey{name ? ` ${name}` : ""} 👋 Tell me what&apos;s on your mind — I&apos;ll sort it into
          tasks, calendar events, and dinner plans for you to review.
        </p>
      </div>

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
          <BrainDumpReview tasks={turn.tasks} events={turn.events} meals={turn.meals} calendars={calendars} />
        </div>
      ))}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 dark:border-gray-700 dark:bg-gray-800">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            resizeTextarea();
          }}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDER}
          rows={1}
          className="max-h-32 flex-1 resize-none self-center bg-transparent px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        <button
          onClick={handleSubmit}
          disabled={submitting || !text.trim()}
          aria-label="Send"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
