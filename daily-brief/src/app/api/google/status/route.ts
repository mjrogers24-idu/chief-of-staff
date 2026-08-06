import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { PARENTS } from "@/lib/googleOAuth";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
}

export async function GET(req: NextRequest) {
  const idToken = bearerToken(req);
  if (!idToken) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }
  try {
    await getAdminAuth().verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const accounts = await Promise.all(
    PARENTS.map(async (parent) => {
      const snap = await getAdminDb().collection("googleAccounts").doc(parent).get();
      const data = snap.data();
      return {
        parent,
        connected: snap.exists,
        email: (data?.email as string | null | undefined) ?? null,
        connectedAt: data?.connectedAt?.toDate?.().toISOString() ?? null,
      };
    }),
  );

  return NextResponse.json({ accounts });
}
