import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const COLLECTION = "openTasks";

/** The forms/paperwork tracker (spec 3.4) — surfaced in the brief until marked done. */
export interface OpenTask {
  id: string;
  title: string;
  /** YYYY-MM-DD, optional */
  dueDate: string | null;
  done: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type OpenTaskInput = Pick<OpenTask, "title" | "dueDate">;

function taskCollection() {
  return collection(db, COLLECTION);
}

export function subscribeOpenTasks(
  onChange: (tasks: OpenTask[]) => void,
  onError: (error: Error) => void,
) {
  const q = query(taskCollection(), orderBy("dueDate"));
  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as OpenTask)),
    onError,
  );
}

export function addOpenTask(input: OpenTaskInput) {
  return addDoc(taskCollection(), {
    ...input,
    done: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function updateOpenTask(id: string, input: Partial<OpenTaskInput>) {
  return updateDoc(doc(db, COLLECTION, id), { ...input, updatedAt: serverTimestamp() });
}

export function setOpenTaskDone(id: string, done: boolean) {
  return updateDoc(doc(db, COLLECTION, id), { done, updatedAt: serverTimestamp() });
}

export function deleteOpenTask(id: string) {
  return deleteDoc(doc(db, COLLECTION, id));
}
