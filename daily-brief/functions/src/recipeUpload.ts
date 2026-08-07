/**
 * Pure prompt-composition and response-parsing for attaching a recipe
 * (usually an Instagram/blog screenshot) to a meal-plan day. Split from
 * the Storage/Gemini IO in parseRecipeUpload.ts the same way calendarUpload.ts
 * is split from parseCalendarUpload.ts.
 */

export interface ParsedRecipe {
  title: string;
  ingredients: string[];
  instructions: string;
}

export function composeRecipeUploadPrompt(): string {
  return [
    "These images are one or more screenshots of a recipe (e.g. from Instagram, a blog, or a recipe card).",
    "If there's more than one image, they're parts of the same recipe (e.g. ingredients in one, steps in another) — combine them into a single recipe.",
    "Extract the recipe into structured data.",
    "",
    'Output valid JSON only, in this shape: { "title": "...", "ingredients": ["...", "..."], "instructions": "..." }',
    '"title" is a short recipe name. "ingredients" is a list of ingredient lines as written (one per item). "instructions" is the full prep/cook steps as plain text (numbered steps on separate lines is fine).',
    "If you can't find a clear recipe in the image(s), still do your best to summarize what's shown rather than leaving fields empty.",
  ].join("\n");
}

/**
 * Recipe screenshots are a casual, best-effort input (not reviewed/
 * confirmed like the daycare calendar upload), so this is lenient:
 * missing fields fall back to sensible defaults rather than failing the
 * whole parse. Only a completely unparseable response throws.
 */
export function parseRecipeUploadResponse(raw: string): ParsedRecipe {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Gemini response was not valid JSON");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Gemini response was not an object");
  }
  const obj = parsed as Record<string, unknown>;

  const title = typeof obj.title === "string" && obj.title.trim() ? obj.title.trim() : "Untitled recipe";
  const ingredients = Array.isArray(obj.ingredients)
    ? obj.ingredients.filter((i): i is string => typeof i === "string" && i.trim().length > 0)
    : [];
  const instructions = typeof obj.instructions === "string" ? obj.instructions.trim() : "";

  return { title, ingredients, instructions };
}
