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

const COLLECTION = "briefRules";

/** Matched against event titles/keywords (case-insensitive contains) to surface prep reminders. */
export interface BriefRule {
  id: string;
  keyword: string;
  /** Optional — scope the rule to a specific child. Null/empty applies to any kid. */
  kid: string | null;
  wearNote: string | null;
  /** e.g. "quick-prep" if this event should trigger a fast dinner. */
  dinnerFlag: string | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type BriefRuleInput = Pick<BriefRule, "keyword" | "kid" | "wearNote" | "dinnerFlag">;

export const STARTER_BRIEF_RULES: BriefRuleInput[] = [
  { keyword: "PE", kid: "Josh", wearNote: "sneakers, athletic clothes", dinnerFlag: null },
  { keyword: "PE", kid: "Riley", wearNote: "sneakers, athletic clothes", dinnerFlag: null },
  { keyword: "field trip", kid: null, wearNote: "check permission slip / packed lunch", dinnerFlag: null },
  { keyword: "dress-up day", kid: "Jake", wearNote: "per that month's daycare calendar theme", dinnerFlag: null },
];

function ruleCollection() {
  return collection(db, COLLECTION);
}

export function subscribeBriefRules(
  onChange: (rules: BriefRule[]) => void,
  onError: (error: Error) => void,
) {
  const q = query(ruleCollection(), orderBy("keyword"));
  return onSnapshot(
    q,
    (snapshot) => {
      const rules = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as BriefRule);
      onChange(rules);
    },
    onError,
  );
}

export function addBriefRule(input: BriefRuleInput) {
  return addDoc(ruleCollection(), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function updateBriefRule(id: string, input: BriefRuleInput) {
  return updateDoc(doc(db, COLLECTION, id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export function deleteBriefRule(id: string) {
  return deleteDoc(doc(db, COLLECTION, id));
}
