/**
 * Pure prompt-composition for "prioritize my list" — advice-only (spec
 * follows the same split-from-IO pattern as brainDump.ts), so unlike the
 * brain-dump flow this returns plain conversational text rather than
 * structured JSON, since there's nothing to save or review here.
 */

export interface PrioritizableTask {
  title: string;
  /** YYYY-MM-DD, or null */
  dueDate: string | null;
}

export function composePrioritizePrompt(tasks: PrioritizableTask[], todayDateKey: string): string {
  const taskLines = tasks.map((t, i) => `${i + 1}. ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : " (no due date)"}`);

  return [
    "You are a household assistant helping a busy parent figure out what to tackle first from",
    "their open to-do list. Today's date is " + todayDateKey + ".",
    "",
    "Open tasks:",
    ...taskLines,
    "",
    "Reply with a short, conversational message (not JSON, not a form) suggesting an order to",
    "tackle these in and a brief reason why — weigh overdue and soon-due items heavily, but also",
    "flag anything that seems quick to knock out. Keep it to a few sentences plus a numbered",
    "list. Speak directly to the parent, like a text message from a helpful assistant.",
  ].join("\n");
}
