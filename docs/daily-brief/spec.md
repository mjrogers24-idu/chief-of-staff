# Daily Brief — Standalone App Spec
### New project (separate from Family Command Center)

## 1. Overview
A standalone app that generates a "Daily Brief" each morning: pulls in school/activity-specific scheduling details (gym days, lunch times, field trips, sports practices), cross-references a rules list to surface prep reminders (what to wear, quick-dinner nights, forms due), generates a dinner plan + grocery list via an AI nutritionist agent, and delivers it by email and/or a simple dashboard.

**Kept separate from Family Command Center on purpose** — granular school/activity scheduling (gym class days, lunch times, field trip logistics) doesn't belong mixed into the broader family calendar/coordination hub.

## 2. Suggested Stack (matches your existing patterns, but a fresh project)
- Next.js 14, Firebase Hosting (or App Hosting)
- Firebase Auth + Firestore (new project, not the Family Command Center Firebase instance) — single user (Michelle); Dan is a connected data source, not a login
- Google Calendar API — read-only pull for one-off/dated events (practices, field trips, appointments) from both parents' calendars
- Gmail API (for email delivery; inbox scanning deferred, see 3.1a)
- Gemini API (for the nutritionist agent, and for parsing uploaded daycare calendars, see 3.0.1)
- New visual identity — doesn't need to match Family Command Center's cream/terracotta look unless you want it to

## 3. New Components

### 3.0 Where Schedule Data Lives
Since this app owns the school/activity-specific details, it needs its own place to store recurring weekly schedules — separate from any Google Calendar pull. Three layers of data feed the brief:
1. **Recurring weekly schedule** (new, lives only in this app) — e.g. "Josh has PE Mon/Thu," "lunch is at 11:40," "specials rotation: art/music/PE." Stored in Firestore, entered once and repeats. See 3.0.2 for initial data.
2. **One-off/dated events** (practices, field trips, appointments) — pulled read-only from Google Calendar (both parents'). **Decided:** no double-entry; the app reads from Google Calendar rather than maintaining its own one-off event entry UI.
3. **Uploaded monthly calendars** (Jake / daycare) — see 3.0.1. Daycare sends a monthly calendar image/PDF rather than a recurring weekly pattern (e.g. random dress-up days), so it needs its own ingestion path distinct from 1 and 2.

### 3.0.1 Monthly Calendar Upload & Parsing (Jake / daycare)
Daycare dress-up days and similar flagged days don't follow a weekly recurrence — they come from a monthly calendar Michelle receives as an image or PDF. **Decided:** auto-parse with Gemini vision rather than manual re-entry.
- Simple upload UI (drag/drop image or PDF, tagged to a kid — currently just Jake — and a month)
- On upload, Gemini vision reads the calendar image and extracts dated events (e.g. "Oct 14 — crazy hair day," "Oct 22 — field trip") as structured JSON
- Extracted events are written into the same one-off dated-events store as the Google Calendar pull (tagged `source: "uploaded-calendar"` so they're distinguishable/re-editable if parsing gets something wrong)
- Michelle gets a quick review/confirm step after parsing before events go live in the brief, since OCR/vision parsing of a daycare calendar graphic is the least reliable data source in the pipeline
- Re-upload for a given kid+month replaces previously parsed events for that month (avoids duplicates when a calendar gets revised)

### 3.0.2 Initial Recurring Weekly Schedule (starter data)
What's known so far, to seed the recurring-schedule collection at build time. Gaps get filled in as they're figured out — this doesn't need to be complete before building.

| Kid | Recurring pattern | Source |
|---|---|---|
| Josh | PE: Monday, Thursday | Known |
| Riley | PE: Tuesday, Thursday | Known |
| Maddie | *(TBD)* | Not yet known |
| Jake | No fixed weekly pattern — daycare dress-up/special days vary month to month | Handled via monthly calendar upload, see 3.0.1, not the recurring-schedule collection |

Lunch times and specials rotation (art/music/PE cycle) for Josh, Riley, and Maddie are still open — add as they're gathered; the schema (3.0) supports adding fields per kid incrementally rather than requiring a fixed set upfront.

### 3.1a Multi-Account Google Integration
- Read-only access to **both** Michelle's and Dan's Google Calendars — each requires its own OAuth consent flow and stored refresh token (two separate Google account connections, not one)
- Events merged into a single daily view, tagged by which parent's calendar they came from (useful for the travel/away-parent flag)
- **Decided:** Dan is a read-only data source only (calendar + eventually email feed the brief); he does not get his own login or dashboard view. Single-user Firebase Auth (Michelle) is sufficient for v1.
- **Gmail scanning** — deferred out of v1. **Decided:** skip inbox scanning for "important" school/activity emails (forms, camp notices, permission slips) in the initial build; revisit as a later phase once the core brief (schedule + rules + nutritionist + delivery) is working. The `openTasks` manual tracker (3.4) covers forms/outstanding items in the meantime.

### 3.1 Rules Engine (Firestore collection: `briefRules`)
Simple keyword → action mapping that Michelle maintains manually (not derived from calendar event structure).

Example schema:
```
{
  keyword: "gym",       // matched against event title (case-insensitive contains)
  kid: "Milo",          // optional — scope to a specific child
  wearNote: "sneakers",
  dinnerFlag: null      // e.g. "quick-prep" if this event should trigger a fast dinner
}
```
Needs a simple admin UI (even a basic table with add/edit/delete) so Michelle isn't editing Firestore by hand.

**Starter rules** (seed data — expand over time as more activities/kids are known):
| keyword | kid | wearNote | dinnerFlag |
|---|---|---|---|
| PE | Josh | sneakers, athletic clothes | null |
| PE | Riley | sneakers, athletic clothes | null |
| field trip | *(any)* | check permission slip / packed lunch | null |
| dress-up day | Jake | per that month's daycare calendar theme (see 3.0.1) | null |

Maddie and Jake's PE/specials-based rules aren't set yet — added once 3.0.2's gaps are filled in (Maddie's schedule) or as monthly calendars come in (Jake).

### 3.2 Daily Ingestion
- Scheduled Cloud Function, runs early each morning (e.g. 5:00 AM)
- Pulls today's (and next 1–2 days', for prep-ahead flags) recurring schedule per kid + any one-off dated events (from this app's own Firestore, and/or a read-only Google Calendar pull if chosen)
- Matches against `briefRules` to generate today's action items (wear reminders, dinner flags, prep-ahead nudges)

### 3.3 Nutritionist Agent (Gemini)
Generates a rolling weekly dinner plan + grocery list. Should factor in:
- **Dietary preferences/restrictions** — see section 3.4
- **Household size** — see section 3.4
- **Variety/rotation** — avoid repeating meals from the last N weeks (store recent meal history in Firestore)
- **Busy-night detection** — auto-swap to a ≤20–25 min meal on nights flagged busy by the calendar ingestion step
- **Favorites list** — see section 3.4
- **Output**: grocery list grouped by aisle (produce–fruit, produce–veg, meat & poultry, dairy & eggs, canned/jarred, grains & pasta, condiments/spices, frozen)

### 3.4 Extras to fold in
- **Weather-aware wear reminders** — pull local forecast, note alongside activity-based wear notes (e.g. "84°F — light layers")
- **Outstanding forms/paperwork tracker** — simple checklist collection (`openTasks`) with due dates, surfaced in the brief until marked done
- **Prep-ahead flags** — if tomorrow is packed, flag tonight for "prep ahead" (e.g. crockpot, marinate, pack bags)
- **Travel/away-parent flag** — if a parent has a travel event on the calendar, adjust pickup/dinner logistics language in the brief

### 3.5 Delivery
- **Email**: sent each morning via Gmail API, formatted similar to the reference screenshots (day-by-day breakdown, grocery list, forms/outstanding section)
- **Dashboard card**: same content rendered as a "Today's Brief" card on the existing Family Command Center homepage, matching current design system

### 3.4 Nutritionist Agent — Prompt Template (filled in)
Household specifics gathered from Michelle — use this as the system prompt template for the Gemini call. `[pulled from ...]` sections are populated dynamically by the Cloud Function each run.

```
You are a family meal-planning assistant. Generate a 5-night dinner plan.

Household: 2 adults + 4 kids, cooking for 6 people per night.
Dietary restrictions: none/no allergies. Kids prefer plain proteins/carbs
and skip vegetable toppings; adults want full toppings (lettuce, tomato,
sour cream, etc). Favor "build-your-own" style meals (tacos, bowls, etc)
where kids and adults can customize their own plate from shared components.

Adult calorie awareness: Michelle and Dan are calorie-conscious. For each
meal, note a lighter option or swap for the adult portion (e.g. lettuce
wrap instead of tortilla, cauliflower rice option, load up on veg
toppings, lean protein swap) without changing what's cooked for the kids.

Skill/time: default meals 20-30 min or slow-cooker; busy nights ≤20 min
active time. Comfort favorites: hamburger helper-style one-skillet meals
and slow-cooker meals are welcome staples, not just backups.

Busy nights this week: [pulled from calendar/rules engine]
Meals served in the last 2-3 weeks (do not repeat): [pulled from Firestore]
Family favorites (rotate these in regularly): Million Dollar Spaghetti +
garlic bread, White Chicken Chili over rice with Fritos, Chicken Nuggets
+ tots, Tacos (build-your-own), Crockpot BBQ Chicken on King's Hawaiian
rolls.

Output valid JSON only, in this shape:
{
  "days": [
    {
      "day": "Mon",
      "meal": "...",
      "time_minutes": 20,
      "prep_type": "one-skillet | slow-cooker | oven | stovetop",
      "kid_version": "...",
      "adult_lighter_option": "...",
      "notes": "..."
    }
  ],
  "grocery_list": {
    "produce_fruit": ["..."],
    "produce_veg": ["..."],
    "meat_poultry": ["..."],
    "dairy_eggs": ["..."],
    "canned_jarred": ["..."],
    "grains_pasta": ["..."],
    "condiments_spices": ["..."],
    "frozen": ["..."]
  }
}
```

**Cloud Function logic**: query Firestore for recent meal history + this week's busy-night flags from the rules engine → interpolate into the template above → call Gemini → parse JSON response → save to Firestore (both as this week's plan and appended to meal history for future dedup) → include in the daily brief.

## 4. Suggested Build Order
1. `briefRules` Firestore schema + basic admin table UI (seed with starter rules from 3.1)
2. Recurring weekly schedule collection (seed with 3.0.2 data) + Google Calendar ingestion Cloud Function (both parents, read-only) + rule matching logic
3. Dashboard "Today's Brief" card (static content first, wire to real data second)
4. Email delivery via Gmail API
5. Nutritionist agent (once dietary/household inputs are provided)
6. Monthly calendar upload + Gemini vision parsing (Jake / daycare)
7. Extras: weather, forms tracker, prep-ahead flags, travel flag
8. *(Later phase, not v1)* Gmail inbox scanning for forms/permission slips

## 5. Open Inputs — Resolved
- [x] ~~Family dietary preferences/restrictions~~ — see section 3.4 (no allergies; build-your-own style; kid vs. adult versions)
- [x] ~~Household size / favorites~~ — see section 3.4
- [x] ~~One-off events source~~ — pull read-only from Google Calendar, no in-app double-entry (3.0)
- [x] ~~Gmail scanning scope~~ — deferred out of v1 entirely; revisit as a later phase (3.1a)
- [x] ~~Dan's access level~~ — read-only data source (calendar) only, no separate login/dashboard (3.1a)
- [x] ~~Initial recurring weekly schedule~~ — Josh: PE Mon/Thu; Riley: PE Tue/Thu; Maddie: TBD; Jake: no fixed pattern, handled via monthly calendar upload instead (3.0.2)
- [x] ~~Initial `briefRules` list~~ — starter rules seeded for Josh/Riley PE days, field trips, and Jake's dress-up days (3.1)

### Still open (non-blocking, fill in as available)
- [ ] Maddie's recurring weekly schedule (gym/PE day, lunch time, specials rotation)
- [ ] Lunch times and specials rotation for Josh and Riley
- [ ] First monthly daycare calendar upload for Jake, to validate the Gemini vision parsing approach (3.0.1)
