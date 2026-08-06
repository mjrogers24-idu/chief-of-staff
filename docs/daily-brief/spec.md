# Daily Brief — Standalone App Spec
### New project (separate from Family Command Center)

## 1. Overview
A standalone app that generates a "Daily Brief" each morning: pulls in school/activity-specific scheduling details (gym days, lunch times, field trips, sports practices), cross-references a rules list to surface prep reminders (what to wear, quick-dinner nights, forms due), generates a dinner plan + grocery list via an AI nutritionist agent, and delivers it by email and/or a simple dashboard.

**Kept separate from Family Command Center on purpose** — granular school/activity scheduling (gym class days, lunch times, field trip logistics) doesn't belong mixed into the broader family calendar/coordination hub.

## 2. Suggested Stack (matches your existing patterns, but a fresh project)
- Next.js 14, Firebase Hosting (or App Hosting)
- Firebase Auth + Firestore (new project, not the Family Command Center Firebase instance)
- Google Calendar API — read access to relevant calendar(s), OR manually-entered recurring school/activity schedules (decide in section 5)
- Gmail API (for email delivery)
- Gemini API (for the nutritionist agent)
- New visual identity — doesn't need to match Family Command Center's cream/terracotta look unless you want it to

## 3. New Components

### 3.0 Where Schedule Data Lives
Since this app owns the school/activity-specific details, it needs its own place to store recurring weekly schedules — separate from any Google Calendar pull. Two layers of data feed the brief:
1. **Recurring weekly schedule** (new, lives only in this app) — e.g. "Milo has gym every Tue/Thu," "lunch is at 11:40," "specials rotation: art/music/PE." Stored in Firestore, entered once and repeats.
2. **One-off/dated events** (practices, field trips, appointments) — either entered directly in this app, or pulled read-only from Google Calendar if you'd rather not double-enter. *(Decide in section 5.)*

### 3.1a Multi-Account Google Integration
- Read-only access to **both** Michelle's and Dan's Google Calendars — each requires its own OAuth consent flow and stored refresh token (two separate Google account connections, not one)
- Events merged into a single daily view, tagged by which parent's calendar they came from (useful for the travel/away-parent flag)
- **Gmail scanning** — read-only access to one or both inboxes, filtered for "important" school/activity emails (forms, camp notices, field trip permission slips, schedule changes). Needs a defined scope so it doesn't surface everyday email noise:
  - Option A: keyword/sender rules (e.g. emails from school domains, subject contains "permission," "form," "field trip")
  - Option B: Gemini classifies each new email as brief-worthy or not
  - Flagged emails surface in the "Forms & Outstanding" section of the brief, same as the manual open-tasks tracker

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
1. `briefRules` Firestore schema + basic admin table UI
2. Calendar ingestion Cloud Function + rule matching logic
3. Dashboard "Today's Brief" card (static content first, wire to real data second)
4. Email delivery via Gmail API
5. Nutritionist agent (once dietary/household inputs are provided)
6. Extras: weather, forms tracker, prep-ahead flags, travel flag

## 5. Open Inputs Needed Before Full Build
- [x] ~~Family dietary preferences/restrictions~~ — see section 3.4 (no allergies; build-your-own style; kid vs. adult versions)
- [x] ~~Household size / favorites~~ — see section 3.4
- [ ] Should one-off events (practices, field trips) live only in this app, or pull read-only from Google Calendar?
- [ ] Gmail scanning scope: which sender domains / keyword rules count as "important," or should Gemini classify emails instead?
- [ ] Does Dan need his own login/view, or just his calendar/email as a read-only data source?
- [ ] Initial recurring weekly schedule per kid (gym days, lunch times, specials)
- [ ] Initial `briefRules` list (which kid, which activities, what prep notes)
