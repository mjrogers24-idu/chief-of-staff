import { google } from "googleapis";

export interface InboxMessage {
  id: string;
  from: string;
  subject: string;
  /** Gmail's own short preview text — used instead of the full body to
   * keep what's sent to Gemini minimal. */
  snippet: string;
  /** As given by the message's own Date header (not reformatted). */
  receivedAt: string;
}

function headerValue(headers: { name?: string | null; value?: string | null }[] | undefined, name: string): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

/**
 * The last 24 hours of primary inbox mail (promotions/social excluded),
 * metadata only — From/Subject/Date headers plus Gmail's own snippet, not
 * the full body. Mirrors sendBriefEmail's OAuth2 client construction in
 * emailBrief.ts, just with a different scope/endpoint.
 */
export async function fetchRecentInboxMessages(refreshToken: string): Promise<InboxMessage[]> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET are not set");
  }
  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  const gmail = google.gmail({ version: "v1", auth });

  const list = await gmail.users.messages.list({
    userId: "me",
    q: "in:inbox newer_than:1d -category:promotions -category:social",
    maxResults: 50,
  });
  const ids = (list.data.messages ?? []).map((m) => m.id).filter((id): id is string => !!id);

  return Promise.all(
    ids.map(async (id) => {
      const res = await gmail.users.messages.get({
        userId: "me",
        id,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"],
      });
      const headers = res.data.payload?.headers;
      return {
        id,
        from: headerValue(headers, "From"),
        subject: headerValue(headers, "Subject"),
        snippet: res.data.snippet ?? "",
        receivedAt: headerValue(headers, "Date"),
      };
    }),
  );
}
