"use client";

import { signOut } from "firebase/auth";
import { CalendarClock, CalendarRange, ChevronRight, ImageUp, LogOut, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/firebase";

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

export default function MorePage() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-gray-500">Setup & less-frequent settings.</p>

      <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {LINKS.map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 ${
              i > 0 ? "border-t border-gray-100" : ""
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <link.icon size={16} strokeWidth={2.25} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-medium text-gray-900">{link.label}</span>
              <span className="block text-xs text-gray-500">{link.description}</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-gray-300" />
          </Link>
        ))}
      </div>

      <button
        onClick={() => signOut(auth)}
        className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <LogOut size={16} />
        Sign out
      </button>
    </div>
  );
}
