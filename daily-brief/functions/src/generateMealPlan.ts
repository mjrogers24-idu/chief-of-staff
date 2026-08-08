import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { addDays, toDateKey, todayInEastern } from "./dailyIngestion";
import { fetchAccounts, fetchConfirmedUploadedEvents, fetchRecurringItems, fetchRules } from "./firestoreReads";
import { callGemini } from "./gemini";
import { fetchMergedCalendarEvents } from "./googleCalendar";
import {
  busyNightsForWeek,
  composeMealPrompt,
  mondayOf,
  parseMealPlanResponse,
  weekdayDates,
  type GroceryList,
  type MealDay,
} from "./mealPlan";

/** How many prior weeks' plans to check for meal-repeat avoidance. */
const RECENT_WEEKS_TO_CHECK = 3;

export interface MealPlan {
  weekStart: string;
  days: MealDay[];
  groceryList: GroceryList;
  generatedAt: string;
}

/**
 * Manually triggered from /admin/meals rather than run on a schedule —
 * grocery shopping is downstream of this, so Michelle gets a review/
 * regenerate step instead of a fully silent weekly job.
 */
export const generateMealPlan = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const db = getFirestore();
  const monday = mondayOf(todayInEastern());
  const weekStart = toDateKey(monday);
  const dates = weekdayDates(monday);

  const [recurringItems, rules, accounts, historySnap] = await Promise.all([
    fetchRecurringItems(db),
    fetchRules(db),
    fetchAccounts(db),
    db
      .collection("mealPlans")
      .where("weekStart", "<", weekStart)
      .orderBy("weekStart", "desc")
      .limit(RECENT_WEEKS_TO_CHECK)
      .get(),
  ]);

  const [calendarEvents, uploadedEvents] = await Promise.all([
    fetchMergedCalendarEvents(
      accounts,
      dates[0],
      addDays(dates[dates.length - 1], 1),
      (account, error) => logger.error(`Calendar fetch failed for ${account.parent}`, error),
    ),
    fetchConfirmedUploadedEvents(db, toDateKey(dates[0]), toDateKey(dates[dates.length - 1])),
  ]);

  const busyNights = busyNightsForWeek(dates, recurringItems, calendarEvents, rules, uploadedEvents);

  const recentMeals = historySnap.docs.flatMap((doc) => {
    const days = (doc.data().days ?? []) as { meal?: string }[];
    return days.map((d) => d.meal).filter((meal): meal is string => !!meal);
  });

  const prompt = composeMealPrompt(busyNights, recentMeals);

  // Split so Cloud Logging shows which stage actually failed: the Gemini
  // call itself (bad/missing GEMINI_API_KEY, quota, model unavailable —
  // logged with the raw error) vs. Gemini responding but not in the
  // expected JSON shape (logged with the raw response text, since the
  // parse error message alone doesn't say what the model actually sent
  // back). Both used to collapse into the same generic "Couldn't
  // generate a meal plan" with no way to tell them apart from outside.
  let raw: string;
  try {
    raw = await callGemini(prompt);
  } catch (error) {
    logger.error("generateMealPlan: Gemini call failed", error);
    throw new HttpsError("internal", "Couldn't reach the meal-planning AI. Try again.");
  }

  let parsed;
  try {
    parsed = parseMealPlanResponse(raw);
  } catch (error) {
    logger.error("generateMealPlan: couldn't parse Gemini's response", { error, raw });
    throw new HttpsError("internal", "Got a response but couldn't make sense of it. Try again.");
  }

  const plan: MealPlan = {
    weekStart,
    days: parsed.days,
    groceryList: parsed.groceryList,
    generatedAt: new Date().toISOString(),
  };

  await db.collection("mealPlans").doc(weekStart).set(plan);

  return plan;
});
