import { NextRequest, NextResponse } from "next/server";
import { createOAuthClient, isParent, scopesFor, signState } from "@/lib/googleOAuth";
import { requireAuth } from "@/lib/verifyRequestAuth";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => null);
  const parent = body?.parent;
  if (!isParent(parent)) {
    return NextResponse.json({ error: "parent must be 'michelle' or 'dan'" }, { status: 400 });
  }

  try {
    const client = createOAuthClient();
    const url = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: scopesFor(parent),
      state: signState(parent),
    });
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Failed to build the Google OAuth consent URL", error);
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
}
