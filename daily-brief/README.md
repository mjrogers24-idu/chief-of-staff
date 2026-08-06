# Daily Brief

Standalone morning family brief app. See [`../docs/daily-brief/spec.md`](../docs/daily-brief/spec.md) for the full project spec.

Build order progress: all 7 items from the spec are scaffolded — `briefRules` + admin UI, recurring schedule + Google Calendar + rule matching + scheduled ingestion, the "Today's Brief" dashboard view, email delivery, the nutritionist agent, Jake's monthly daycare-calendar upload, and the extras (weather, forms tracker, prep-ahead flags, travel flag). What's left is real infrastructure (a live Firebase/Google Cloud project) rather than more app code — see "Not yet built" below for the couple of things still explicitly out of scope.

Note on item 3: the spec (3.5) also wants this card on the *Family Command Center* app's homepage — that's a separate codebase not available in this repo/session, so it's out of scope here. `/admin/today` is the Daily Brief app's own equivalent; the same `dailyBriefs/{date}` read could be reused to build the Family Command Center card later.

## Setup

1. Create a new Firebase project (separate from Family Command Center's), on the **Blaze plan** (required for Cloud Functions to make outbound calls to the Google Calendar/Gemini APIs).
2. Enable **Firestore**, **Storage**, and **Authentication → Email/Password**, and create one user (Michelle).
3. Firebase console → Project settings → Service accounts → Generate new private key. This is `FIREBASE_SERVICE_ACCOUNT_KEY` below (as one line of JSON).
4. Google Cloud Console (same or linked project) → APIs & Services:
   - Enable the **Google Calendar API**.
   - Configure the OAuth consent screen (internal/testing is fine for a 2-user app).
   - Create an OAuth client ID (Web application) with an authorized redirect URI of `<GOOGLE_OAUTH_REDIRECT_BASE_URL>/api/google/callback` (e.g. `http://localhost:3000/api/google/callback` for local dev).
5. Copy `.env.local.example` to `.env.local` and fill in all values — Firebase SDK config, `FIREBASE_SERVICE_ACCOUNT_KEY`, the Google OAuth client, and a random `OAUTH_STATE_SECRET` (`openssl rand -hex 32`).
6. Copy `functions/.env.example` to `functions/.env` and fill in the same Google OAuth client ID/secret, a `GEMINI_API_KEY` (Google AI Studio → Get API key), and `WEATHER_LATITUDE`/`WEATHER_LONGITUDE` for the home location (decimal degrees) used by the weather-aware wear reminders.
7. In `functions/src/index.ts`, set `TIMEZONE` to the family's actual timezone (defaults to a placeholder).
8. Deploy: `firebase use <project-id>`, then `npx firebase-tools deploy` (Firestore + Storage rules and all functions together).
9. `npm install && npm run dev`, then sign in at `/login`.
10. In `/admin/calendars`, connect Michelle's and Dan's Google accounts (each does its own OAuth consent — Michelle's also grants `gmail.send` so the ingestion job can email the brief from her account; Dan's is calendar-only).

Once both calendars are connected and there's at least one `briefRules`/`recurringSchedule` entry, `dailyIngestion` runs automatically every morning at 5am (family timezone), writes `dailyBriefs/{date}` docs, and — once Michelle has granted `gmail.send` — emails that day's brief to every connected parent's address. If Michelle hasn't granted that scope yet (e.g. she connected before this feature existed and hasn't reconnected), the job logs and skips the email rather than failing the whole run. Trigger it manually to test: `firebase functions:shell` → `dailyIngestion()`, or via the Firebase console's "Run now" on the scheduled function.

In `/admin/meals`, click "Generate this week's plan" to call the `generateMealPlan` Cloud Function directly (no schedule — grocery shopping is downstream of this, so it's a manual/reviewable action rather than a silent weekly job).

In `/admin/daycare`, upload Jake's monthly daycare calendar (image or PDF) to have Gemini vision parse dress-up days and other flagged days into events — they land unconfirmed for review; only confirmed ones feed into `dailyIngestion`/`generateMealPlan`. Re-uploading for the same kid+month replaces whatever was parsed there before.

In `/admin/tasks`, track outstanding forms/paperwork with an optional due date; anything not marked done shows up in that day's brief (dashboard + email) until it is.

## What's here

- `src/lib/firebase.ts` — Firebase client init (auth + Firestore)
- `src/lib/firebaseAdmin.ts` — Firebase Admin init for server routes (service account, bypasses Firestore rules)
- `src/lib/firestore/briefRules.ts` — `briefRules` schema, CRUD helpers, and starter seed data
- `src/lib/firestore/recurringSchedule.ts` — recurring weekly schedule schema, CRUD helpers, starter data, and date-matching helpers
- `src/lib/ruleMatcher.ts` — pure keyword → action matching logic (unit-tested in `ruleMatcher.test.ts`)
- `src/lib/googleOAuth.ts` — Google OAuth client + signed-state helpers for the Calendar connect flow
- `src/lib/firestore/dailyBriefs.ts` — read-only access to `dailyBriefs/{date}`, written by the ingestion Cloud Function
- `src/lib/firestore/mealPlans.ts` — read-only access to `mealPlans/{weekStart}`, plus the `generateMealPlan()` callable wrapper
- `src/lib/firestore/uploadedEvents.ts` — CRUD for parsed daycare-calendar events (Michelle edits/confirms/deletes these directly)
- `src/lib/firestore/openTasks.ts` — CRUD for the forms/paperwork tracker
- `src/lib/calendarUpload.ts` — uploads a calendar file to Storage, then triggers `parseCalendarUpload`
- `src/lib/auth-context.tsx` — auth state provider
- `src/app/login` — email/password sign-in
- `src/app/admin/today` — the "Today's Brief" dashboard card (weather/prep-ahead/travel highlights, schedule, prep reminders, and outstanding forms for today), the app's home view after sign-in
- `src/app/admin/rules` — rules admin table (add/edit/delete, seed starter rules when empty)
- `src/app/admin/schedule` — recurring schedule admin table, plus a "brief preview" panel showing what today/tomorrow would flag
- `src/app/admin/calendars` — connect/disconnect Michelle's and Dan's Google Calendars
- `src/app/admin/meals` — this week's dinner plan + grocery list, with a manual "generate" trigger
- `src/app/admin/daycare` — upload Jake's monthly daycare calendar; review/edit/confirm the parsed events
- `src/app/admin/tasks` — the forms/paperwork tracker (add/edit/delete, mark done)
- `src/app/api/google/*` — server routes for the OAuth connect flow (`connect-url`, `callback`, `status`, `disconnect`)
- `firestore.rules` — `briefRules`/`recurringSchedule`/`uploadedEvents`/`openTasks` readable/writable by the signed-in user; `googleAccounts` (OAuth refresh tokens) is server-only; `dailyBriefs`/`mealPlans` are server-write/client-read
- `storage.rules` — `daycare-calendars/**` readable/writable by the signed-in user (parsing itself happens server-side via the Admin SDK)
- `functions/` — separate Node project (Firebase Functions v2, its own `package.json`/deploy).
  - `dailyIngestion` runs on a 5am schedule: pulls the recurring schedule, both parents' Google Calendars, confirmed `uploadedEvents`, and open `openTasks` for today + next 2 days, runs the rule-matching logic (mirrored from `src/lib/ruleMatcher.ts` since this deploys independently of the Next app), composes the extras (`extras.ts`: weather note from `weather.ts`'s Open-Meteo fetch, a prep-ahead-tonight note when tomorrow's brief has a dinner-flagged action, a travel/away-parent note from calendar events matching a "travel" keyword), writes `dailyBriefs/{date}`, and emails today's full brief (`emailBrief.ts`, using Michelle's `gmail.send`-scoped refresh token) to every connected parent.
  - `generateMealPlan` is a callable function (triggered from `/admin/meals`, not scheduled): computes this week's Mon-Fri busy nights by re-running the same recurring-schedule + calendar + uploaded-events + rule-matching pipeline for that window, pulls the last 3 weeks' meals from `mealPlans` for repeat-avoidance, composes the spec 3.4 prompt (`mealPlan.ts`), calls Gemini (`gemini.ts`), validates/parses the JSON response, and writes `mealPlans/{weekStart}`.
  - `parseCalendarUpload` is a callable function (triggered from `/admin/daycare` right after the client uploads a file to Storage): downloads the file via the Admin SDK, sends it to Gemini vision with a prompt for the target kid+month (`calendarUpload.ts`), validates/parses the JSON response (dropping individual malformed entries rather than failing the whole parse — vision parsing of a photographed calendar is the least reliable data source in the pipeline), and replaces any previously parsed `uploadedEvents` for that kid+month with the new (unconfirmed) ones.
  - `src/dailyIngestion.ts`, `extras.ts`, the `composeBriefEmail` half of `emailBrief.ts`, `mealPlan.ts`'s prompt-composition/response-parsing/busy-night logic, and `calendarUpload.ts`'s prompt-composition/response-parsing are all pure — split from the Firestore/Calendar/Storage/Gmail/Gemini/weather IO in `index.ts`, `generateMealPlan.ts`, and `parseCalendarUpload.ts` — so the interesting logic is unit-tested without live services.

Everything under `/admin` is client-rendered and auth-gated; there's no public data. Run `npm test` in both `daily-brief/` and `daily-brief/functions/` for the unit tests.

## Not yet built

The Family Command Center homepage card (spec 3.5) needs that other app's codebase, which isn't available in this repo/session. Gmail inbox scanning for forms/permission slips (spec 3.1a) was explicitly deferred out of v1 per the section 5 decision. The email's grocery-list/meal-plan section isn't wired in — `mealPlans` exists and `/admin/meals` shows it, but `composeBriefEmail` doesn't pull it in yet. The travel-note keyword ("travel") is hardcoded in `extras.ts` rather than configurable.
