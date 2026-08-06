import "server-only";
import { NextRequest, NextResponse } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth } from "@/lib/firebaseAdmin";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
}

/**
 * Verifies the request's bearer token, returning either the decoded
 * token or a NextResponse to return immediately.
 *
 * Deliberately distinguishes two failure modes that used to collapse
 * into the same generic 401 "Invalid token": the Admin SDK itself
 * failing to initialize (a real server misconfiguration — e.g. a
 * corrupted FIREBASE_SERVICE_ACCOUNT_KEY secret) versus the token
 * genuinely not verifying (expired/invalid sign-in). The former is a
 * 500 with the underlying error logged server-side; conflating the two
 * made a broken secret nearly undiagnosable from the client's POV.
 */
export async function requireAuth(
  req: NextRequest,
): Promise<{ decoded: DecodedIdToken; response?: undefined } | { decoded?: undefined; response: NextResponse }> {
  const idToken = bearerToken(req);
  if (!idToken) {
    return { response: NextResponse.json({ error: "Missing bearer token" }, { status: 401 }) };
  }

  let auth;
  try {
    auth = getAdminAuth();
  } catch (error) {
    console.error("Firebase Admin SDK failed to initialize", error);
    return { response: NextResponse.json({ error: "Server misconfigured" }, { status: 500 }) };
  }

  try {
    const decoded = await auth.verifyIdToken(idToken);
    return { decoded };
  } catch (error) {
    console.error("ID token verification failed", error);
    return { response: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }
}
