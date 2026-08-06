import { doc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";

const COLLECTION = "mealPlans";

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
