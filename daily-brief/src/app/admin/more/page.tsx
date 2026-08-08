"use client";

import { signOut } from "firebase/auth";
import { CalendarClock, CalendarRange, ChevronRight, ImageUp, LogOut, Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { useTheme, type Theme } from "@/lib/theme-context";

interface MoreLink {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const LINKS: MoreLink[] = [
  {
    href: "/admin/calendars",
    label: "Calendars",
    description: "Connect Michelle & Dan's Google Calendars",
    icon: CalendarRange,
  },
  {
    href: "/admin/rules",
    label: "Rules",
    description: "What to flag — wear notes, dinner impacts, prep-ahead",
    icon: CalendarClock,
  },
  {
    href: "/admin/schedule",
    label: "Schedule",
    description: "The recurring weekly activities the brief is built from",
    icon: CalendarClock,
  },
  {
    href: "/admin/daycare",
    label: "Daycare",
    description: "Upload Jake's monthly calendar for dress-up days & events",
    icon: ImageUp,
  },
];

const THEME_OPTIONS: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Appearance</p>
      <div className="flex gap-2">
        {THEME_OPTIONS.map((opt) => {
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs ${
                active
                  ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/30 dark:text-brand-300"
                  : "border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400"
              }`}
            >
              <opt.icon size={16} />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MorePage() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">Setup & less-frequent settings.</p>

      <ThemeToggle />

      <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        {LINKS.map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/60 ${
              i > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
              <link.icon size={16} strokeWidth={2.25} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{link.label}</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">{link.description}</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-gray-300" />
          </Link>
        ))}
      </div>

      <button
        onClick={() => signOut(auth)}
        className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/60"
      >
        <LogOut size={16} />
        Sign out
      </button>
    </div>
  );
}
