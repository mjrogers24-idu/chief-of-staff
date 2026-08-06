import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const COLLECTION = "uploadedEvents";

/** Parsed from an uploaded daycare calendar via Gemini vision (spec 3.0.1). */
export interface UploadedEvent {
  id: string;
  kid: string;
  /** YYYY-MM */
  month: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  confirmed: boolean;
  source: "uploaded-calendar";
  uploadId: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export function subscribeUploadedEvents(
  kid: string,
  month: string,
  onChange: (events: UploadedEvent[]) => void,
  onError: (error: Error) => void,
) {
  const q = query(
    collection(db, COLLECTION),
    where("kid", "==", kid),
    where("month", "==", month),
    orderBy("date"),
  );
  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as UploadedEvent)),
    onError,
  );
}

export function updateUploadedEvent(
  id: string,
  input: Partial<Pick<UploadedEvent, "date" | "title" | "confirmed">>,
) {
  return updateDoc(doc(db, COLLECTION, id), input);
}

export function deleteUploadedEvent(id: string) {
  return deleteDoc(doc(db, COLLECTION, id));
}
