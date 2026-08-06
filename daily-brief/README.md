# Daily Brief

Standalone morning family brief app. See [`../docs/daily-brief/spec.md`](../docs/daily-brief/spec.md) for the full project spec.

Build order progress: item 1 (`briefRules` schema + admin UI), item 2 (recurring schedule, Google Calendar connection, rule matching, and the scheduled ingestion Cloud Function), and item 3 (the "Today's Brief" dashboard view, within this app) are scaffolded. Item 4 (email delivery) is next.

Note on item 3: the spec (3.5) also wants this card on the *Family Command Center* app's homepage — that's a separate codebase not available in this repo/session, so it's out of scope here. `/admin/today` is the Daily Brief app's own equivalent; the same `dailyBriefs/{date}` read could be reused to build the Family Command Center card later.

## Setup

1. Create a new Firebase project (separate from Family Command Center's), on the **Blaze plan** (required for Cloud Functions to make outbound calls to the Google Calendar API).
2. Enable **Firestore** and **Authentication → Email/Password**, and create one user (Michelle).
3. Firebase console → Project settings → Service accounts → Generate new private key. This is `FIREBASE_SERVICE_ACCOUNT_KEY` below (as one line of JSON).
4. Google Cloud Console (same or linked project) → APIs & Services:
   - Enable the **Google Calendar API**.
   - Configure the OAuth consent screen (internal/testing is fine for a 2-user app).
   - Create an OAuth client ID (Web application) with an authorized redirect URI of `<GOOGLE_OAUTH_REDIRECT_BASE_URL>/api/google/callback` (e.g. `http://localhost:3000/api/google/callback` for local dev).
5. Copy `.env.local.example` to `.env.local` and fill in all values — Firebase SDK config, `FIREBASE_SERVICE_ACCOUNT_KEY`, the Google OAuth client, and a random `OAUTH_STATE_SECRET` (`openssl rand -hex 32`).
6. Copy `functions/.env.example` to `functions/.env` and fill in the same Google OAuth client ID/secret.
7. In `functions/src/index.ts`, set `TIMEZONE` to the family's actual timezone (defaults to a placeholder).
8. Deploy: `firebase use <project-id>`, then `npx firebase-tools deploy` (rules + the scheduled function together).
9. `npm install && npm run dev`, then sign in at `/login`.
10. In `/admin/calendars`, connect Michelle's and Dan's Google accounts (each does its own OAuth consent — read-only Calendar access).

Once both calendars are connected and there's at least one `briefRules`/`recurringSchedule` entry, `dailyIngestion` runs automatically every morning at 5am (family timezone) and writes `dailyBriefs/{date}` docs. Trigger it manually to test: `firebase functions:shell` → `dailyIngestion()`, or via the Firebase console's "Run now" on the scheduled function.

## What's here

- `src/lib/firebase.ts` — Firebase client init (auth + Firestore)
- `src/lib/firebaseAdmin.ts` — Firebase Admin init for server routes (service account, bypasses Firestore rules)
- `src/lib/firestore/briefRules.ts` — `briefRules` schema, CRUD helpers, and starter seed data
- `src/lib/firestore/recurringSchedule.ts` — recurring weekly schedule schema, CRUD helpers, starter data, and date-matching helpers
- `src/lib/ruleMatcher.ts` — pure keyword → action matching logic (unit-tested in `ruleMatcher.test.ts`)
- `src/lib/googleOAuth.ts` — Google OAuth client + signed-state helpers for the Calendar connect flow
- `src/lib/firestore/dailyBriefs.ts` — read-only access to `dailyBriefs/{date}`, written by the ingestion Cloud Function
- `src/lib/auth-context.tsx` — auth state provider
- `src/app/login` — email/password sign-in
- `src/app/admin/today` — the "Today's Brief" dashboard card (schedule + prep reminders for today), the app's home view after sign-in
- `src/app/admin/rules` — rules admin table (add/edit/delete, seed starter rules when empty)
- `src/app/admin/schedule` — recurring schedule admin table, plus a "brief preview" panel showing what today/tomorrow would flag
- `src/app/admin/calendars` — connect/disconnect Michelle's and Dan's Google Calendars
- `src/app/api/google/*` — server routes for the OAuth connect flow (`connect-url`, `callback`, `status`, `disconnect`)
- `firestore.rules` — `briefRules`/`recurringSchedule` readable/writable by the signed-in user; `googleAccounts` (OAuth refresh tokens) is server-only; `dailyBriefs` is server-write/client-read
- `functions/` — separate Node project (Firebase Functions v2, its own `package.json`/deploy). `dailyIngestion` runs on a 5am schedule: pulls the recurring schedule + both parents' Google Calendars for today + next 2 days, runs the same rule-matching logic (mirrored from `src/lib/ruleMatcher.ts` since this deploys independently of the Next app), and writes `dailyBriefs/{date}`. `src/dailyIngestion.ts` separates the pure "assemble a brief from already-fetched data" logic from the Firestore/Calendar IO in `index.ts`, so the assembly logic is unit-tested without live services.

Everything under `/admin` is client-rendered and auth-gated; there's no public data. Run `npm test` in both `daily-brief/` and `daily-brief/functions/` for the unit tests.

## Not yet built

Per the spec's build order: email delivery, the nutritionist agent, and the extras (weather, forms tracker, prep-ahead flags, travel flag). The Jake daycare-calendar upload (spec 3.0.1) also isn't wired into `dailyIngestion` yet — it's a separate later build-order item. The Family Command Center homepage card (spec 3.5) needs that other app's codebase.
