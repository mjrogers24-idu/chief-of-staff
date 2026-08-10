import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { toDateKey, todayInEastern } from "./dailyIngestion";
import { callGemini } from "./gemini";
import { composePrioritizePrompt, type PrioritizableTask } from "./prioritize";

interface PrioritizeTasksRequest {
  tasks: PrioritizableTask[];
}

/**
 * Triggered from the "Prioritize my list" action in Chat — Michelle already
 * has the current open-tasks list loaded client-side, so it's passed in
 * rather than re-fetched here. Advice-only: returns a plain message, saves
 * nothing.
 */
export const prioritizeTasks = onCall(async (request): Promise<{ message: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const { tasks } = (request.data ?? {}) as Partial<PrioritizeTasksRequest>;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new HttpsError("invalid-argument", "tasks must be a non-empty array.");
  }

  const todayDateKey = toDateKey(todayInEastern());
  const prompt = composePrioritizePrompt(tasks, todayDateKey);

  try {
    const message = await callGemini(prompt);
    return { message };
  } catch (error) {
    logger.error("prioritizeTasks: Gemini call failed", error);
    throw new HttpsError("internal", "Couldn't work through your list. Try again.");
  }
});
