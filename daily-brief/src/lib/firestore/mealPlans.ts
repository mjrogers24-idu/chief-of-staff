import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";

const COLLECTION = "mealPlans";

export const MEAL_PLAN_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
export type MealPlanWeekday = (typeof MEAL_PLAN_WEEKDAYS)[number];

export type GroceryCategory =
  | "produce_fruit"
  | "produce_veg"
  | "meat_poultry"
  | "dairy_eggs"
  | "canned_jarred"
  | "grains_pasta"
  | "condiments_spices"
  | "frozen";

export type GroceryList = Record<GroceryCategory, string[]>;

export const GROCERY_CATEGORY_LABELS: Record<GroceryCategory, string> = {
  produce_fruit: "Produce — Fruit",
  produce_veg: "Produce — Vegetables",
  meat_poultry: "Meat & Poultry",
  dairy_eggs: "Dairy & Eggs",
  canned_jarred: "Canned / Jarred",
  grains_pasta: "Grains & Pasta",
  condiments_spices: "Condiments / Spices",
  frozen: "Frozen",
};

export interface MealDay {
  day: string;
  meal: string;
  time_minutes: number;
  prep_type: string;
  kid_version: string;
  adult_lighter_option: string;
  notes: string;
}

/** Written by the generateMealPlan Cloud Function (functions/src/generateMealPlan.ts). */
export interface MealPlanDoc {
  weekStart: string;
  days: MealDay[];
  groceryList: GroceryList;
  generatedAt: string;
}

/** Mirrors functions/src/mealPlan.ts's mondayOf — the Monday of the week containing `date`. */
export function currentWeekStart(date: Date = new Date()): string {
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  return monday.toISOString().slice(0, 10);
}

export function subscribeMealPlan(
  weekStart: string,
  onChange: (plan: MealPlanDoc | null) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    doc(db, COLLECTION, weekStart),
    (snap) => onChange(snap.exists() ? (snap.data() as MealPlanDoc) : null),
    onError,
  );
}

export async function generateMealPlan(): Promise<MealPlanDoc> {
  const call = httpsCallable<void, MealPlanDoc>(functions, "generateMealPlan");
  const result = await call();
  return result.data;
}

const EMPTY_GROCERY_LIST: GroceryList = {
  produce_fruit: [],
  produce_veg: [],
  meat_poultry: [],
  dairy_eggs: [],
  canned_jarred: [],
  grains_pasta: [],
  condiments_spices: [],
  frozen: [],
};

/**
 * Manual add/edit for a single day (spec doesn't cover this — added so
 * there's a fallback when Gemini generation fails or Michelle just wants
 * to fill in a dinner herself). Replaces any existing entry for the same
 * weekday; creates the week's doc if it doesn't exist yet.
 */
export async function upsertMealDay(weekStart: string, day: MealDay): Promise<void> {
  const ref = doc(db, COLLECTION, weekStart);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? (snap.data() as MealPlanDoc) : null;

  const days = (existing?.days ?? []).filter((d) => d.day !== day.day);
  days.push(day);
  days.sort((a, b) => MEAL_PLAN_WEEKDAYS.indexOf(a.day as MealPlanWeekday) - MEAL_PLAN_WEEKDAYS.indexOf(b.day as MealPlanWeekday));

  const plan: MealPlanDoc = {
    weekStart,
    days,
    groceryList: existing?.groceryList ?? EMPTY_GROCERY_LIST,
    generatedAt: existing?.generatedAt ?? new Date().toISOString(),
  };
  await setDoc(ref, plan);
}

export async function deleteMealDay(weekStart: string, day: string): Promise<void> {
  const ref = doc(db, COLLECTION, weekStart);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const existing = snap.data() as MealPlanDoc;
  await setDoc(ref, { ...existing, days: existing.days.filter((d) => d.day !== day) });
}
