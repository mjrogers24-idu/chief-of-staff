# Daily Brief

Standalone morning family brief app. See [`../docs/daily-brief/spec.md`](../docs/daily-brief/spec.md) for the full project spec.

This is the initial slice: the `briefRules` schema, single-user auth, and an admin table to manage rules (build order item 1).

## Setup

1. Create a new Firebase project (separate from Family Command Center's).
2. Enable **Firestore** and **Authentication → Email/Password**, and create one user (Michelle).
3. Copy `.env.local.example` to `.env.local` and fill in the values from Project settings → General → Your apps → SDK setup and configuration.
4. Deploy the security rules: `npx firebase-tools deploy --only firestore:rules` (after `firebase use <project-id>`).
5. `npm install && npm run dev`, then sign in at `/login`.

## What's here

- `src/lib/firebase.ts` — Firebase client init (auth + Firestore)
- `src/lib/firestore/briefRules.ts` — `briefRules` schema, CRUD helpers, and starter seed data
- `src/lib/auth-context.tsx` — auth state provider
- `src/app/login` — email/password sign-in
- `src/app/admin/rules` — rules admin table (add/edit/delete, seed starter rules when empty)
- `firestore.rules` — restricts `briefRules` to the signed-in user

Everything under `/admin` is client-rendered and auth-gated; there's no public data.
