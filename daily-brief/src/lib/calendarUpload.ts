import { ref, uploadBytes } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { functions, storage } from "@/lib/firebase";

interface ParseCalendarUploadResult {
  events: { id: string; date: string; title: string }[];
}

/**
 * Uploads a daycare calendar image/PDF to Storage, then triggers the
 * parseCalendarUpload Cloud Function (Gemini vision) to extract dated
 * events into Firestore as unconfirmed uploadedEvents. Re-uploading for
 * the same kid+month replaces whatever was parsed there before.
 */
export async function uploadDaycareCalendar(
  file: File,
  kid: string,
  month: string,
): Promise<ParseCalendarUploadResult> {
  const storagePath = `daycare-calendars/${kid}/${month}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });

  const call = httpsCallable<{ kid: string; month: string; storagePath: string }, ParseCalendarUploadResult>(
    functions,
    "parseCalendarUpload",
  );
  const result = await call({ kid, month, storagePath });
  return result.data;
}
