"use client";

import type { RecurringScheduleItem } from "@/lib/firestore/recurringSchedule";

interface ScheduleTableProps {
  items: RecurringScheduleItem[];
  onEdit: (item: RecurringScheduleItem) => void;
  onDelete: (item: RecurringScheduleItem) => void;
}

export function ScheduleTable({ items, onEdit, onDelete }: ScheduleTableProps) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No recurring schedule items yet.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
          <th className="py-2 pr-4 font-medium">Kid</th>
          <th className="py-2 pr-4 font-medium">Label</th>
          <th className="py-2 pr-4 font-medium">Days</th>
          <th className="py-2 pr-4 font-medium">Note</th>
          <th className="py-2 font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800">
            <td className="py-2 pr-4">{item.kid}</td>
            <td className="py-2 pr-4">{item.label}</td>
            <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
              {item.daysOfWeek.length ? item.daysOfWeek.join(", ") : "every day"}
            </td>
            <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{item.note || "—"}</td>
            <td className="py-2">
              <button onClick={() => onEdit(item)} className="mr-3 text-gray-700 dark:text-gray-300 underline">
                Edit
              </button>
              <button onClick={() => onDelete(item)} className="text-red-600 dark:text-red-400 underline">
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
