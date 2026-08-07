import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { callGeminiVision, type GeminiImage } from "./gemini";
import { composeRecipeUploadPrompt, parseRecipeUploadResponse, type ParsedRecipe } from "./recipeUpload";

interface ParseRecipeUploadRequest {
  /** Paths within the default Storage bucket, e.g. "recipe-photos/2026-08-03/Thu/abc.jpg" */
  storagePaths: string[];
}

/**
 * Triggered from the meal-plan form right after the client finishes
 * uploading recipe screenshot(s) to Storage. Unlike parseCalendarUpload,
 * this is a casual best-effort read (no confirm step) — Michelle can
 * still edit the meal/ingredients/instructions fields it fills in before
 * saving.
 */
export const parseRecipeUpload = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const data = (request.data ?? {}) as Partial<ParseRecipeUploadRequest>;
  const storagePaths = data.storagePaths;
  if (!Array.isArray(storagePaths) || storagePaths.length === 0) {
    throw new HttpsError("invalid-argument", "storagePaths must be a non-empty array.");
  }

  const bucket = getStorage().bucket();
  let images: GeminiImage[];
  try {
    images = await Promise.all(
      storagePaths.map(async (storagePath) => {
        const file = bucket.file(storagePath);
        const [exists] = await file.exists();
        if (!exists) throw new HttpsError("not-found", "Uploaded file not found — try uploading again.");
        const [buffer] = await file.download();
        const [metadata] = await file.getMetadata();
        return { base64Data: buffer.toString("base64"), mimeType: metadata.contentType ?? "application/octet-stream" };
      }),
    );
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Failed to read uploaded recipe photo(s)", error);
    throw new HttpsError("not-found", "Uploaded file not found — try uploading again.");
  }

  let recipe: ParsedRecipe;
  try {
    const raw = await callGeminiVision(composeRecipeUploadPrompt(), images);
    recipe = parseRecipeUploadResponse(raw);
  } catch (error) {
    logger.error("Recipe upload parsing failed", error);
    throw new HttpsError("internal", "Couldn't read that recipe. Try clearer photos, or fill it in yourself.");
  }

  logger.info(`Parsed recipe "${recipe.title}" from ${storagePaths.length} image(s)`);
  return recipe;
});
