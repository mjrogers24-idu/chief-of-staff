import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { isParent, type Parent } from "@/lib/parents";

export { isParent, PARENTS } from "@/lib/parents";
export type { Parent } from "@/lib/parents";

export const CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

/**
 * Both parents' calendars feed the brief, but only Michelle's account is
 * used to send the brief and scan the inbox for follow-up suggestions
 * (spec 3.5) — so only her connection needs the extra scopes. Reconnecting
 * (the UI always forces prompt=consent) picks up a scope change for an
 * already-connected account.
 */
export function scopesFor(parent: Parent): string[] {
  return parent === "michelle"
    ? [CALENDAR_READONLY_SCOPE, GMAIL_SEND_SCOPE, GMAIL_READONLY_SCOPE]
    : [CALENDAR_READONLY_SCOPE];
}

function redirectUri() {
  const base = process.env.GOOGLE_OAUTH_REDIRECT_BASE_URL;
  if (!base) throw new Error("GOOGLE_OAUTH_REDIRECT_BASE_URL is not set");
  return `${base.replace(/\/$/, "")}/api/google/callback`;
}

export function createOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET are not set");
  }
  return new OAuth2Client(clientId, clientSecret, redirectUri());
}

const STATE_TTL_MS = 10 * 60 * 1000;

function stateSecret() {
  const secret = process.env.OAUTH_STATE_SECRET;
  if (!secret) throw new Error("OAUTH_STATE_SECRET is not set");
  return secret;
}

/**
 * The OAuth `state` param round-trips through Google and the user's
 * browser, so it can't carry an unsigned parent identifier — anyone could
 * hit the callback with state=dan and overwrite Dan's stored refresh
 * token. Sign it so the callback only trusts state this server issued.
 */
export function signState(parent: Parent): string {
  const payload = JSON.stringify({ parent, exp: Date.now() + STATE_TTL_MS });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  const signature = createHmac("sha256", stateSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyState(state: string): Parent {
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) throw new Error("Malformed state");

  const expectedSignature = createHmac("sha256", stateSecret()).update(encoded).digest("base64url");
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new Error("Invalid state signature");
  }

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
    parent: string;
    exp: number;
  };
  if (Date.now() > payload.exp) throw new Error("State expired");
  if (!isParent(payload.parent)) throw new Error("Unknown parent in state");
  return payload.parent;
}
