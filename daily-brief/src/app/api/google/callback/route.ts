import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { appBaseUrl, createOAuthClient, verifyState, type Parent } from "@/lib/googleOAuth";

function redirect(params: Record<string, string>) {
  const url = new URL("/admin/calendars", appBaseUrl());
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) return redirect({ error: oauthError });
  if (!code || !state) return redirect({ error: "missing_code_or_state" });

  let parent: Parent;
  try {
    parent = verifyState(state);
  } catch {
    return redirect({ error: "invalid_state" });
  }

  const client = createOAuthClient();
  let refreshToken: string | null | undefined;
  let scope: string | null | undefined;
  try {
    const { tokens } = await client.getToken(code);
    refreshToken = tokens.refresh_token;
    scope = tokens.scope;
    client.setCredentials(tokens);
  } catch {
    return redirect({ error: "token_exchange_failed" });
  }

  if (!refreshToken) {
    // Google only issues a refresh token on first consent for an app;
    // access_type=offline + prompt=consent (set in connect-url) should
    // always trigger this, but a stale consent could still skip it.
    return redirect({ error: "no_refresh_token" });
  }

  let email: string | null = null;
  try {
    const info = await client.request<{ email?: string }>({
      url: "https://www.googleapis.com/oauth2/v2/userinfo",
    });
    email = info.data.email ?? null;
  } catch {
    // Non-fatal — the connection still works without a display email.
  }

  await getAdminDb()
    .collection("googleAccounts")
    .doc(parent)
    .set({
      parent,
      email,
      refreshToken,
      scope: scope ?? null,
      connectedAt: FieldValue.serverTimestamp(),
    });

  return redirect({ connected: parent });
}
