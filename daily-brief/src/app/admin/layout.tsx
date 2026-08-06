"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { href: "/admin/today", label: "Today" },
  { href: "/admin/rules", label: "Rules" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/calendars", label: "Calendars" },
  { href: "/admin/meals", label: "Meals" },
  { href: "/admin/daycare", label: "Daycare" },
  { href: "/admin/tasks", label: "Tasks" },
];

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
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <div className="mb-4 flex items-center justify-between sm:mb-8">
        <h1 className="text-lg font-semibold sm:text-xl">Daily Brief admin</h1>
        <button
          onClick={() => signOut(auth)}
          className="text-sm text-gray-500 underline"
        >
          Sign out
        </button>
      </div>
      <nav className="mb-6 -mx-4 flex gap-4 overflow-x-auto whitespace-nowrap border-b border-gray-200 px-4 pb-3 text-sm sm:mb-8">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 text-gray-700 hover:underline"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
