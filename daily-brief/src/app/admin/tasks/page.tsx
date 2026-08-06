"use client";

import { useEffect, useState } from "react";
import {
  addOpenTask,
  subscribeOpenTasks,
  updateOpenTask,
  type OpenTask,
  type OpenTaskInput,
} from "@/lib/firestore/openTasks";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TasksTable } from "@/components/tasks/TasksTable";

type FormMode = { kind: "add" } | { kind: "edit"; task: OpenTask } | null;

export default function TasksPage() {
  const [tasks, setTasks] = useState<OpenTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);

  useEffect(() => {
    return subscribeOpenTasks(
      (data) => {
        setTasks(data);
        setLoading(false);
      },
      () => {
        setError("Couldn't load tasks.");
        setLoading(false);
      },
    );
  }, []);

  async function handleAdd(input: OpenTaskInput) {
    await addOpenTask(input);
    setFormMode(null);
  }

  async function handleUpdate(id: string, input: OpenTaskInput) {
    await updateOpenTask(id, input);
    setFormMode(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Outstanding forms/paperwork — surfaced in the brief until marked done.
        </p>
        {!formMode && (
          <button
            onClick={() => setFormMode({ kind: "add" })}
            className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            Add task
          </button>
        )}
      </div>

      {formMode?.kind === "add" && <TaskForm onSubmit={handleAdd} onCancel={() => setFormMode(null)} />}
      {formMode?.kind === "edit" && (
        <TaskForm
          initialValue={formMode.task}
          onSubmit={(input) => handleUpdate(formMode.task.id, input)}
          onCancel={() => setFormMode(null)}
        />
      )}

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && (
        <TasksTable tasks={tasks} onEdit={(task) => setFormMode({ kind: "edit", task })} />
      )}
    </div>
  );
}
