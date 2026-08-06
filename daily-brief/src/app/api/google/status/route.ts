import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { PARENTS } from "@/lib/googleOAuth";
import { requireAuth } from "@/lib/verifyRequestAuth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.response) return auth.response;

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
