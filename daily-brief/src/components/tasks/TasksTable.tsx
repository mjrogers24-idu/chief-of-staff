"use client";

import { deleteOpenTask, setOpenTaskDone, type OpenTask } from "@/lib/firestore/openTasks";

interface TasksTableProps {
  tasks: OpenTask[];
  onEdit: (task: OpenTask) => void;
}

export function TasksTable({ tasks, onEdit }: TasksTableProps) {
  if (tasks.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No outstanding forms/paperwork.</p>;
  }

  async function handleDelete(task: OpenTask) {
    if (!confirm(`Delete "${task.title}"?`)) return;
    await deleteOpenTask(task.id);
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
          <th className="py-2 pr-4 font-medium">Done</th>
          <th className="py-2 pr-4 font-medium">Title</th>
          <th className="py-2 pr-4 font-medium">Due</th>
          <th className="py-2 font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr key={task.id} className="border-b border-gray-100 dark:border-gray-800">
            <td className="py-2 pr-4">
              <input
                type="checkbox"
                checked={task.done}
                onChange={(e) => setOpenTaskDone(task.id, e.target.checked)}
              />
            </td>
            <td className={`py-2 pr-4 ${task.done ? "text-gray-400 dark:text-gray-500 line-through" : ""}`}>
              {task.title}
            </td>
            <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{task.dueDate || "—"}</td>
            <td className="py-2">
              <button onClick={() => onEdit(task)} className="mr-3 text-gray-700 dark:text-gray-300 underline">
                Edit
              </button>
              <button onClick={() => handleDelete(task)} className="text-red-600 dark:text-red-400 underline">
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
