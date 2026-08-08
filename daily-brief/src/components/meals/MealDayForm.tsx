"use client";

import { useRef, useState, type FormEvent } from "react";
import { MEAL_PLAN_WEEKDAYS, type MealDay } from "@/lib/firestore/mealPlans";
import { uploadRecipeImages } from "@/lib/recipeUpload";

const EMPTY: MealDay = {
  day: "Mon",
  meal: "",
  time_minutes: 0,
  prep_type: "",
  kid_version: "",
  adult_lighter_option: "",
  notes: "",
  recipeUrl: "",
  recipeImageUrls: [],
  recipeIngredients: [],
  recipeInstructions: "",
};

interface MealDayFormProps {
  initialValue?: MealDay;
  /** Disable changing the day (editing an existing entry keeps its weekday). */
  lockDay?: boolean;
  /** Needed to namespace uploaded recipe photos in Storage. */
  weekStart: string;
  onSubmit: (day: MealDay) => Promise<void>;
  onCancel: () => void;
}

export function MealDayForm({ initialValue, lockDay, weekStart, onSubmit, onCancel }: MealDayFormProps) {
  const [values, setValues] = useState<MealDay>(initialValue ?? EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [parsingPhotos, setParsingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  async function handleReadPhotos() {
    const files = photoInput.current?.files;
    if (!files || files.length === 0) {
      setPhotoError("Choose one or more photos first.");
      return;
    }
    setPhotoError(null);
    setParsingPhotos(true);
    try {
      const { recipe, imageUrls } = await uploadRecipeImages(Array.from(files), weekStart, values.day);
      setValues((v) => ({
        ...v,
        meal: v.meal.trim() ? v.meal : recipe.title,
        recipeIngredients: recipe.ingredients,
        recipeInstructions: recipe.instructions,
        recipeImageUrls: [...(v.recipeImageUrls ?? []), ...imageUrls],
      }));
      if (photoInput.current) photoInput.current.value = "";
    } catch {
      setPhotoError("Couldn't read that recipe. Try clearer photos, or fill it in yourself below.");
    } finally {
      setParsingPhotos(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values.meal.trim()) {
      setError("Meal is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ ...values, meal: values.meal.trim(), recipeUrl: values.recipeUrl?.trim() || "" });
    } catch {
      setError("Couldn't save. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Day
          <select
            value={values.day}
            disabled={lockDay}
            onChange={(e) => setValues((v) => ({ ...v, day: e.target.value }))}
            className="rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100 dark:border-gray-600 dark:disabled:bg-gray-700"
          >
            {MEAL_PLAN_WEEKDAYS.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Meal *
          <input
            value={values.meal}
            onChange={(e) => setValues((v) => ({ ...v, meal: e.target.value }))}
            className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
            placeholder="e.g. Tacos (build-your-own)"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Time (minutes)
          <input
            type="number"
            min={0}
            value={values.time_minutes || ""}
            onChange={(e) => setValues((v) => ({ ...v, time_minutes: Number(e.target.value) || 0 }))}
            className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Prep type
          <input
            value={values.prep_type}
            onChange={(e) => setValues((v) => ({ ...v, prep_type: e.target.value }))}
            className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
            placeholder="e.g. slow-cooker"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Kids version
          <input
            value={values.kid_version}
            onChange={(e) => setValues((v) => ({ ...v, kid_version: e.target.value }))}
            className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Adults (lighter option)
          <input
            value={values.adult_lighter_option}
            onChange={(e) => setValues((v) => ({ ...v, adult_lighter_option: e.target.value }))}
            className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Notes
        <input
          value={values.notes}
          onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
          className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
        />
      </label>

      <div className="flex flex-col gap-3 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
        <p className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Recipe (optional)</p>
        <label className="flex flex-col gap-1 text-sm">
          Link to the recipe
          <input
            type="url"
            value={values.recipeUrl ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, recipeUrl: e.target.value }))}
            className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
            placeholder="https://..."
          />
        </label>
        <div className="flex flex-col gap-1.5 text-sm">
          <span>Or photos of the recipe (e.g. Instagram screenshots)</span>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={photoInput} type="file" accept="image/*" multiple className="text-sm" />
            <button
              type="button"
              onClick={handleReadPhotos}
              disabled={parsingPhotos}
              className="shrink-0 rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs disabled:opacity-50"
            >
              {parsingPhotos ? "Reading recipe…" : "Read recipe from photos"}
            </button>
          </div>
          {photoError && <p className="text-xs text-red-600 dark:text-red-400">{photoError}</p>}
          {(values.recipeImageUrls?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {values.recipeImageUrls!.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt="Uploaded recipe" className="h-16 w-16 rounded object-cover" />
              ))}
            </div>
          )}
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Ingredients (one per line)
          <textarea
            value={(values.recipeIngredients ?? []).join("\n")}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                recipeIngredients: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
              }))
            }
            rows={3}
            className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Instructions
          <textarea
            value={values.recipeInstructions ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, recipeInstructions: e.target.value }))}
            rows={3}
            className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1"
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="rounded px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
          Cancel
        </button>
      </div>
    </form>
  );
}
