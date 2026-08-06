"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-sm text-gray-500">
        Loading…
      </main>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Daily Brief admin</h1>
        <button
          onClick={() => signOut(auth)}
          className="text-sm text-gray-500 underline"
        >
          Sign out
        </button>
      </div>
      {children}
    </div>
  );
}
