"use client";

import { CalendarDays, ChefHat, ClipboardList, MoreHorizontal, Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";

interface Tab {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Also highlighted as active when the path starts with one of these. */
  matchPrefixes?: string[];
}

const TABS: Tab[] = [
  { href: "/admin/today", label: "Today", icon: CalendarDays },
  { href: "/admin/braindump", label: "Chat", icon: Sparkles },
  { href: "/admin/meals", label: "Meals", icon: ChefHat },
  { href: "/admin/tasks", label: "Tasks", icon: ClipboardList },
  {
    href: "/admin/more",
    label: "More",
    icon: MoreHorizontal,
    matchPrefixes: ["/admin/rules", "/admin/schedule", "/admin/calendars", "/admin/daycare"],
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-sm text-gray-500 dark:text-gray-400">
        Loading…
      </main>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-4 sm:py-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white">
          D
        </span>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Daily Brief</h1>
      </header>

      <main className="mx-auto max-w-3xl px-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1.5">
          {TABS.map((tab) => {
            const active = pathname === tab.href || tab.matchPrefixes?.some((p) => pathname?.startsWith(p));
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-xs ${
                  active ? "text-brand-600" : "text-gray-400 dark:text-gray-500"
                }`}
              >
                <tab.icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span className={active ? "font-medium" : ""}>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
