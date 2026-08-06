import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { isParent } from "@/lib/googleOAuth";
import { requireAuth } from "@/lib/verifyRequestAuth";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => null);
  const parent = body?.parent;
  if (!isParent(parent)) {
    return NextResponse.json({ error: "parent must be 'michelle' or 'dan'" }, { status: 400 });
  }

  await getAdminDb().collection("googleAccounts").doc(parent).delete();
  return NextResponse.json({ ok: true });
}
