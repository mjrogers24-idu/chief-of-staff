import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | undefined;

function getAdminApp(): App {
  if (app) return app;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!json) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
  }
  app = getApps().length ? getApps()[0]! : initializeApp({ credential: cert(JSON.parse(json)) });
  return app;
}

// Lazy on purpose: `next build` imports every route module to collect its
// metadata, which would otherwise crash on a missing env var even though
// nothing in the route actually ran yet.
export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}
