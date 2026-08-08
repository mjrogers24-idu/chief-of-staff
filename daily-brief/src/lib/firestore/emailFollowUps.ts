import { collection, deleteDoc, doc, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { addOpenTask } from "@/lib/firestore/openTasks";

const COLLECTION = "emailFollowUps";

/** Suggested by the daily gmail.readonly inbox scan (scanInboxFollowUps). */
export interface EmailFollowUpSuggestion {
  id: string;
  from: string;
  subject: string;
  reason: string;
  /** As given by the email's own Date header. */
  receivedAt: string;
  createdAt: Timestamp | null;
}

export function subscribeEmailFollowUps(
  onChange: (suggestions: EmailFollowUpSuggestion[]) => void,
  onError: (error: Error) => void,
) {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as EmailFollowUpSuggestion)),
    onError,
  );
}

/** Turns a suggestion into a real task, then removes the suggestion. */
export async function confirmEmailFollowUp(suggestion: EmailFollowUpSuggestion): Promise<void> {
  await addOpenTask({ title: `Follow up: ${suggestion.subject || suggestion.from}`, dueDate: null });
  await deleteDoc(doc(db, COLLECTION, suggestion.id));
}

export function dismissEmailFollowUp(id: string): Promise<void> {
  return deleteDoc(doc(db, COLLECTION, id));
}
