import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const ACCENTS = {
  blue: "bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300",
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300",
  sage: "bg-sage-100 text-sage-700 dark:bg-sage-900/30 dark:text-sage-300",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
} as const;

interface WidgetProps {
  icon: LucideIcon;
  title: string;
  accent?: keyof typeof ACCENTS;
  children: ReactNode;
}

export function Widget({ icon: Icon, title, accent = "blue", children }: WidgetProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${ACCENTS[accent]}`}>
          <Icon size={16} strokeWidth={2.25} />
        </span>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      </div>
      {children}
    </div>
  );
}
