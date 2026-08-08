"use client";

import { deleteUploadedEvent, updateUploadedEvent, type UploadedEvent } from "@/lib/firestore/uploadedEvents";

interface UploadedEventsTableProps {
  events: UploadedEvent[];
}

export function UploadedEventsTable({ events }: UploadedEventsTableProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No parsed events yet for this kid/month. Upload a calendar above.
      </p>
    );
  }

  async function handleDelete(event: UploadedEvent) {
    if (!confirm(`Delete "${event.title}" on ${event.date}?`)) return;
    await deleteUploadedEvent(event.id);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Review before confirming — Gemini vision parsing of a photographed calendar is the least
        reliable data source in the app. Only confirmed events show up in the brief.
      </p>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
            <th className="py-2 pr-4 font-medium">Date</th>
            <th className="py-2 pr-4 font-medium">Title</th>
            <th className="py-2 pr-4 font-medium">Confirmed</th>
            <th className="py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4">
                <input
                  type="date"
                  defaultValue={event.date}
                  onBlur={(e) => e.target.value !== event.date && updateUploadedEvent(event.id, { date: e.target.value })}
                  className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
                />
              </td>
              <td className="py-2 pr-4">
                <input
                  defaultValue={event.title}
                  onBlur={(e) => e.target.value !== event.title && updateUploadedEvent(event.id, { title: e.target.value })}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
                />
              </td>
              <td className="py-2 pr-4">
                <input
                  type="checkbox"
                  checked={event.confirmed}
                  onChange={(e) => updateUploadedEvent(event.id, { confirmed: e.target.checked })}
                />
              </td>
              <td className="py-2">
                <button onClick={() => handleDelete(event)} className="text-red-600 dark:text-red-400 underline">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
