import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { createOAuthClient, isParent, scopesFor, signState } from "@/lib/googleOAuth";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
}

export async function POST(req: NextRequest) {
  const idToken = bearerToken(req);
  if (!idToken) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }
  try {
    await getAdminAuth().verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parent = body?.parent;
  if (!isParent(parent)) {
    return NextResponse.json({ error: "parent must be 'michelle' or 'dan'" }, { status: 400 });
  }

  const client = createOAuthClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopesFor(parent),
    state: signState(parent),
  });

  return NextResponse.json({ url });
}
