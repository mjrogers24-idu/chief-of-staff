import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { functions, storage } from "@/lib/firebase";

interface ParsedRecipe {
  title: string;
  ingredients: string[];
  instructions: string;
}

interface UploadRecipeImagesResult {
  recipe: ParsedRecipe;
  imageUrls: string[];
}

/**
 * Uploads one or more recipe screenshots (e.g. an Instagram post) to
 * Storage, then triggers the parseRecipeUpload Cloud Function (Gemini
 * vision) to extract a title, ingredient list, and instructions.
 * MealDayForm fills its fields in from the result, but the user can edit
 * before saving — this is a starting point, not a confirmed source.
 */
export async function uploadRecipeImages(
  files: File[],
  weekStart: string,
  day: string,
): Promise<UploadRecipeImagesResult> {
  const storagePaths = files.map((file) => `recipe-photos/${weekStart}/${day}/${Date.now()}-${file.name}`);

  await Promise.all(
    files.map((file, i) => uploadBytes(ref(storage, storagePaths[i]), file, { contentType: file.type })),
  );
  const imageUrls = await Promise.all(storagePaths.map((path) => getDownloadURL(ref(storage, path))));

  const call = httpsCallable<{ storagePaths: string[] }, ParsedRecipe>(functions, "parseRecipeUpload");
  const result = await call({ storagePaths });

  return { recipe: result.data, imageUrls };
}
