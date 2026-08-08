import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const ACCENTS = {
  blue: "bg-sky-50 text-sky-600",
  brand: "bg-brand-50 text-brand-600",
  sage: "bg-sage-100 text-sage-700",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-700",
} as const;

interface WidgetProps {
  icon: LucideIcon;
  title: string;
  accent?: keyof typeof ACCENTS;
  children: ReactNode;
}

export function Widget({ icon: Icon, title, accent = "blue", children }: WidgetProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${ACCENTS[accent]}`}>
          <Icon size={16} strokeWidth={2.25} />
        </span>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}
