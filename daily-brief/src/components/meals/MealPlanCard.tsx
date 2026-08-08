"use client";

import { useState } from "react";
import { GROCERY_CATEGORY_LABELS, type MealDay, type MealPlanDoc } from "@/lib/firestore/mealPlans";

function dayHasRecipe(day: MealDay): boolean {
  return !!(
    day.recipeUrl ||
    (day.recipeImageUrls?.length ?? 0) > 0 ||
    (day.recipeIngredients?.length ?? 0) > 0 ||
    day.recipeInstructions
  );
}

function RecipeDetails({ day }: { day: MealDay }) {
  const [open, setOpen] = useState(false);
  if (!dayHasRecipe(day)) return null;

  return (
    <div className="mt-2">
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs text-gray-700 dark:text-gray-300 underline">
        {open ? "Hide recipe" : "View recipe"}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-3 text-sm">
          {day.recipeUrl && (
            <a href={day.recipeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">
              {day.recipeUrl}
            </a>
          )}
          {(day.recipeImageUrls?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {day.recipeImageUrls!.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt="Recipe" className="h-20 w-20 rounded object-cover" />
              ))}
            </div>
          )}
          {(day.recipeIngredients?.length ?? 0) > 0 && (
            <div>
              <p className="font-medium">Ingredients</p>
              <ul className="list-inside list-disc text-gray-600 dark:text-gray-400">
                {day.recipeIngredients!.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {day.recipeInstructions && (
            <div>
              <p className="font-medium">Instructions</p>
              <p className="whitespace-pre-wrap text-gray-600 dark:text-gray-400">{day.recipeInstructions}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MealPlanCardProps {
  plan: MealPlanDoc | null;
  loading?: boolean;
  error?: string | null;
  generating?: boolean;
  repeatingDay?: string | null;
  onGenerate: () => void;
  onAddDay: () => void;
  onEditDay: (day: MealDay) => void;
  onDeleteDay: (day: MealDay) => void;
  onRepeatDay: (day: MealDay) => void;
}

export function MealPlanCard({
  plan,
  loading,
  error,
  generating,
  repeatingDay,
  onGenerate,
  onAddDay,
  onEditDay,
  onDeleteDay,
  onRepeatDay,
}: MealPlanCardProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Rolling weekly dinner plan + grocery list. Generate with Gemini from the household prompt
          in the spec, or add/edit dinners yourself below.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={onAddDay}
            className="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm"
          >
            Add a dinner
          </button>
          <button
            onClick={onGenerate}
            disabled={generating}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {generating ? "Generating…" : plan ? "Regenerate this week" : "Generate this week's plan"}
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!loading && !error && !plan && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No plan yet for this week. Generating calls Gemini with this week&apos;s busy nights and
          recent meal history to avoid repeats — or click &quot;Add a dinner&quot; to fill one in
          yourself.
        </p>
      )}

      {plan && (
        <>
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Dinners</h3>
            {plan.days.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">No dinners added for this week yet.</p>
            )}
            {plan.days.map((day, i) => (
              <div key={i} className="rounded border border-gray-200 dark:border-gray-700 p-3 text-sm">
                <div className="flex items-baseline justify-between">
                  <span className="font-medium">
                    {day.day} — {day.meal}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {day.time_minutes ? `${day.time_minutes} min` : ""}
                      {day.prep_type ? ` · ${day.prep_type}` : ""}
                    </span>
                    <button
                      onClick={() => onRepeatDay(day)}
                      disabled={repeatingDay === day.day}
                      className="text-xs text-sage-700 underline disabled:opacity-50 dark:text-sage-400"
                    >
                      {repeatingDay === day.day ? "Repeating…" : "Repeat next week"}
                    </button>
                    <button onClick={() => onEditDay(day)} className="text-xs text-gray-700 dark:text-gray-300 underline">
                      Edit
                    </button>
                    <button onClick={() => onDeleteDay(day)} className="text-xs text-red-600 dark:text-red-400 underline">
                      Delete
                    </button>
                  </span>
                </div>
                {day.kid_version && (
                  <p className="mt-1 text-gray-600 dark:text-gray-400">Kids: {day.kid_version}</p>
                )}
                {day.adult_lighter_option && (
                  <p className="text-gray-600 dark:text-gray-400">Adults (lighter): {day.adult_lighter_option}</p>
                )}
                {day.notes && <p className="mt-1 text-gray-400 dark:text-gray-500">{day.notes}</p>}
                <RecipeDetails day={day} />
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Grocery list</h3>
            {Object.values(plan.groceryList).every((items) => items.length === 0) ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No grocery list yet — generated automatically alongside a Gemini plan.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {(Object.keys(GROCERY_CATEGORY_LABELS) as (keyof typeof GROCERY_CATEGORY_LABELS)[])
                  .filter((category) => plan.groceryList[category]?.length)
                  .map((category) => (
                    <div key={category}>
                      <p className="font-medium">{GROCERY_CATEGORY_LABELS[category]}</p>
                      <ul className="text-gray-600 dark:text-gray-400">
                        {plan.groceryList[category].map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
