/**
 * Pure prompt-composition and response-parsing for the daily inbox scan —
 * split from the Gmail/Gemini/Firestore IO in scanInboxFollowUps.ts, same
 * pattern as calendarUpload.ts / mealPlan.ts.
 */

export interface InboxMessage {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string;
}

export interface FollowUpSuggestion {
  messageId: string;
  from: string;
  subject: string;
  reason: string;
  receivedAt: string;
}

export function composeFollowUpPrompt(messages: InboxMessage[]): string {
  return [
    "Here are emails received in the last 24 hours. Identify only the ones that genuinely look like",
    "they need a reply or action from the recipient — skip newsletters, receipts, automated",
    "notifications, marketing, and anything that looks already resolved.",
    "",
    "Emails:",
    ...messages.map((m, i) => `${i + 1}. [id=${m.id}] From: ${m.from} | Subject: ${m.subject} | Preview: ${m.snippet}`),
    "",
    'Output valid JSON only, as an array: [{ "id": "...", "reason": "short reason this needs a follow-up" }, ...].',
    'Only include emails that need action — output "[]" if none do.',
  ].join("\n");
}

/**
 * These are casual best-effort suggestions (no confirm-before-use gate
 * upstream of this, unlike the daycare calendar upload), so this is
 * deliberately lenient: entries that don't match a known message id, or
 * are missing a reason, are dropped rather than failing the whole parse.
 */
export function parseFollowUpResponse(raw: string, messages: InboxMessage[]): FollowUpSuggestion[] {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Gemini response was not valid JSON");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response was not a JSON array");
  }

  const byId = new Map(messages.map((m) => [m.id, m]));
  const suggestions: FollowUpSuggestion[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const { id, reason } = item as Record<string, unknown>;
    if (typeof id !== "string" || typeof reason !== "string" || !reason.trim()) continue;
    const message = byId.get(id);
    if (!message) continue;
    suggestions.push({
      messageId: message.id,
      from: message.from,
      subject: message.subject,
      reason: reason.trim(),
      receivedAt: message.receivedAt,
    });
  }
  return suggestions;
}
