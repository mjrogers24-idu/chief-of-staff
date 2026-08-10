import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export interface PrioritizableTask {
  title: string;
  dueDate: string | null;
}

/** Advice-only — returns a plain message, saves nothing. */
export async function prioritizeTasks(tasks: PrioritizableTask[]): Promise<string> {
  const call = httpsCallable<{ tasks: PrioritizableTask[] }, { message: string }>(functions, "prioritizeTasks");
  const result = await call({ tasks });
  return result.data.message;
}
