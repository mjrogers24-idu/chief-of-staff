"use client";

import { GROCERY_CATEGORY_LABELS, type MealDay, type MealPlanDoc } from "@/lib/firestore/mealPlans";

interface MealPlanCardProps {
  plan: MealPlanDoc | null;
  loading?: boolean;
  error?: string | null;
  generating?: boolean;
  onGenerate: () => void;
  onAddDay: () => void;
  onEditDay: (day: MealDay) => void;
  onDeleteDay: (day: MealDay) => void;
}

export function MealPlanCard({
  plan,
  loading,
  error,
  generating,
  onGenerate,
  onAddDay,
  onEditDay,
  onDeleteDay,
}: MealPlanCardProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Rolling weekly dinner plan + grocery list. Generate with Gemini from the household prompt
          in the spec, or add/edit dinners yourself below.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={onAddDay}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          >
            Add a dinner
          </button>
          <button
            onClick={onGenerate}
            disabled={generating}
            className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {generating ? "Generating…" : plan ? "Regenerate this week" : "Generate this week's plan"}
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && !plan && (
        <p className="text-sm text-gray-500">
          No plan yet for this week. Generating calls Gemini with this week&apos;s busy nights and
          recent meal history to avoid repeats — or click &quot;Add a dinner&quot; to fill one in
          yourself.
        </p>
      )}

      {plan && (
        <>
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase text-gray-400">Dinners</h3>
            {plan.days.length === 0 && (
              <p className="text-sm text-gray-500">No dinners added for this week yet.</p>
            )}
            {plan.days.map((day, i) => (
              <div key={i} className="rounded border border-gray-200 p-3 text-sm">
                <div className="flex items-baseline justify-between">
                  <span className="font-medium">
                    {day.day} — {day.meal}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {day.time_minutes ? `${day.time_minutes} min` : ""}
                      {day.prep_type ? ` · ${day.prep_type}` : ""}
                    </span>
                    <button onClick={() => onEditDay(day)} className="text-xs text-gray-700 underline">
                      Edit
                    </button>
                    <button onClick={() => onDeleteDay(day)} className="text-xs text-red-600 underline">
                      Delete
                    </button>
                  </span>
                </div>
                {day.kid_version && (
                  <p className="mt-1 text-gray-600">Kids: {day.kid_version}</p>
                )}
                {day.adult_lighter_option && (
                  <p className="text-gray-600">Adults (lighter): {day.adult_lighter_option}</p>
                )}
                {day.notes && <p className="mt-1 text-gray-400">{day.notes}</p>}
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase text-gray-400">Grocery list</h3>
            {Object.values(plan.groceryList).every((items) => items.length === 0) ? (
              <p className="text-sm text-gray-500">
                No grocery list yet — generated automatically alongside a Gemini plan.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {(Object.keys(GROCERY_CATEGORY_LABELS) as (keyof typeof GROCERY_CATEGORY_LABELS)[])
                  .filter((category) => plan.groceryList[category]?.length)
                  .map((category) => (
                    <div key={category}>
                      <p className="font-medium">{GROCERY_CATEGORY_LABELS[category]}</p>
                      <ul className="text-gray-600">
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
