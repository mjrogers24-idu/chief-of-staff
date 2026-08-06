import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { isParent } from "@/lib/googleOAuth";

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

  await getAdminDb().collection("googleAccounts").doc(parent).delete();
  return NextResponse.json({ ok: true });
}
