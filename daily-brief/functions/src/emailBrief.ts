import { google } from "googleapis";
import type { BriefDocument } from "./dailyIngestion";

export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

export interface BriefEmailContent {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function scheduleLine(item: BriefDocument["scheduleItems"][number]): string {
  return item.kid ? `${item.kid} — ${item.title}` : item.title;
}

function actionLine(action: BriefDocument["actions"][number]): string {
  const notes: string[] = [];
  if (action.rule.wearNote) notes.push(`wear ${action.rule.wearNote}`);
  if (action.rule.dinnerFlag) notes.push(`dinner: ${action.rule.dinnerFlag}`);
  const who = action.item.kid ?? "Family";
  const suffix = notes.length ? `: ${notes.join(", ")}` : "";
  return `${who} — ${action.item.title}${suffix}`;
}

function taskLine(task: BriefDocument["openTasks"][number]): string {
  return task.dueDate ? `${task.title} (due ${task.dueDate})` : task.title;
}

/**
 * Pure — no network calls — so it's unit-tested directly. sendBriefEmail
 * below is the IO half (Gmail API), same split as googleCalendar.ts and
 * the Firestore/Calendar fetch in index.ts.
 */
export function composeBriefEmail(brief: BriefDocument): BriefEmailContent {
  const dateLabel = formatDate(brief.date);
  const subject = `Daily Brief — ${dateLabel}`;

  const scheduleLines = brief.scheduleItems.length
    ? brief.scheduleItems.map(scheduleLine)
    : ["Nothing on the schedule today."];
  const actionLines = brief.actions.length ? brief.actions.map(actionLine) : ["Nothing flagged."];
  const highlights = [brief.weatherNote, brief.prepAheadNote, brief.travelNote].filter(
    (line): line is string => !!line,
  );
  const taskLines = brief.openTasks.map(taskLine);

  const text = [
    subject,
    "",
    ...(highlights.length ? [...highlights, ""] : []),
    "SCHEDULE",
    ...scheduleLines.map((line) => `- ${line}`),
    "",
    "PREP REMINDERS",
    ...actionLines.map((line) => `- ${line}`),
    ...(taskLines.length ? ["", "FORMS & OUTSTANDING", ...taskLines.map((line) => `- ${line}`)] : []),
  ].join("\n");

  const html = [
    '<div style="font-family: sans-serif; max-width: 480px; color: #111;">',
    "<h2>Daily Brief</h2>",
    `<p style="color:#666">${escapeHtml(dateLabel)}</p>`,
    ...(highlights.length
      ? [`<ul>${highlights.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`]
      : []),
    "<h3>Schedule</h3>",
    `<ul>${scheduleLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`,
    "<h3>Prep reminders</h3>",
    `<ul>${actionLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`,
    ...(taskLines.length
      ? [
          "<h3>Forms &amp; outstanding</h3>",
          `<ul>${taskLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`,
        ]
      : []),
    "</div>",
  ].join("");

  return { subject, text, html };
}

function buildRawMessage(to: string[], from: string | null, content: BriefEmailContent): string {
  const boundary = "daily_brief_boundary";
  const headers = [`To: ${to.join(", ")}`, `Subject: ${content.subject}`];
  if (from) headers.push(`From: ${from}`);
  headers.push("MIME-Version: 1.0", `Content-Type: multipart/alternative; boundary="${boundary}"`);

  const message = [
    ...headers,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    content.text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    content.html,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  return Buffer.from(message).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sendBriefEmail(
  refreshToken: string,
  to: string[],
  from: string | null,
  content: BriefEmailContent,
): Promise<void> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET are not set");
  }
  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: "v1", auth });
  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: buildRawMessage(to, from, content) },
  });
}
