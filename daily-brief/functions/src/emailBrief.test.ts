import { describe, expect, it } from "vitest";
import { composeBriefEmail } from "./emailBrief";
import type { BriefDocument } from "./dailyIngestion";

function brief(overrides: Partial<BriefDocument>): BriefDocument {
  return {
    date: "2026-08-06",
    scheduleItems: [],
    actions: [],
    generatedAt: "2026-08-06T09:00:00.000Z",
    weatherNote: null,
    prepAheadNote: null,
    travelNote: null,
    openTasks: [],
    dinnerTonight: null,
    ...overrides,
  };
}

describe("composeBriefEmail", () => {
  it("formats the subject with a human-readable date", () => {
    const { subject } = composeBriefEmail(brief({}));
    expect(subject).toBe("Daily Brief — Thursday, August 6");
  });

  it("lists schedule items with their kid prefix", () => {
    const { text, html } = composeBriefEmail(
      brief({
        scheduleItems: [
          { id: "1", title: "PE", date: "2026-08-06", kid: "Josh", source: "recurring" },
          { id: "2", title: "Zoo trip", date: "2026-08-06", kid: null, source: "calendar" },
        ],
      }),
    );
    expect(text).toContain("- Josh — PE");
    expect(text).toContain("- Zoo trip");
    expect(html).toContain("<li>Josh — PE</li>");
  });

  it("falls back to a friendly message when there's nothing scheduled", () => {
    const { text } = composeBriefEmail(brief({}));
    expect(text).toContain("Nothing on the schedule today.");
    expect(text).toContain("Nothing flagged.");
  });

  it("includes wear notes and dinner flags in action lines", () => {
    const { text } = composeBriefEmail(
      brief({
        actions: [
          {
            item: { id: "1", title: "PE", date: "2026-08-06", kid: "Josh", source: "recurring" },
            rule: { keyword: "PE", kid: "Josh", wearNote: "sneakers", dinnerFlag: "quick-prep" },
          },
        ],
      }),
    );
    expect(text).toContain("- Josh — PE: wear sneakers, dinner: quick-prep");
  });

  it("escapes HTML-significant characters from event titles", () => {
    const { html } = composeBriefEmail(
      brief({
        scheduleItems: [
          { id: "1", title: '<b>"Field Trip" & more</b>', date: "2026-08-06", kid: null, source: "calendar" },
        ],
      }),
    );
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;b&gt;&quot;Field Trip&quot; &amp; more&lt;/b&gt;");
  });

  it("omits the highlights section when weather/prep-ahead/travel are all null", () => {
    const { text, html } = composeBriefEmail(brief({}));
    expect(text.startsWith("Daily Brief — Thursday, August 6\n\nSCHEDULE")).toBe(true);
    expect(html).not.toContain("<ul></ul><h3>Schedule</h3>");
  });

  it("includes weather, prep-ahead, and travel notes when present", () => {
    const { text, html } = composeBriefEmail(
      brief({
        weatherNote: "84°F / 62°F — light layers",
        prepAheadNote: "Tomorrow is busy — prep ahead tonight.",
        travelNote: "Dan is traveling today — Michelle covering pickup/dinner logistics.",
      }),
    );
    for (const line of [
      "84°F / 62°F — light layers",
      "Tomorrow is busy — prep ahead tonight.",
      "Dan is traveling today",
    ]) {
      expect(text).toContain(line);
      expect(html).toContain(line);
    }
  });

  it("includes a Forms & Outstanding section only when there are open tasks", () => {
    const withoutTasks = composeBriefEmail(brief({}));
    expect(withoutTasks.text).not.toContain("FORMS & OUTSTANDING");

    const withTasks = composeBriefEmail(
      brief({ openTasks: [{ id: "1", title: "Field trip permission slip", dueDate: "2026-08-08" }] }),
    );
    expect(withTasks.text).toContain("FORMS & OUTSTANDING");
    expect(withTasks.text).toContain("- Field trip permission slip (due 2026-08-08)");
    expect(withTasks.html).toContain("Field trip permission slip (due 2026-08-08)");
  });

  it("includes a Dinner Tonight section only when a meal plan covers today", () => {
    const withoutDinner = composeBriefEmail(brief({}));
    expect(withoutDinner.text).not.toContain("DINNER TONIGHT");

    const withDinner = composeBriefEmail(
      brief({
        dinnerTonight: {
          day: "Thu",
          meal: "Tacos (build-your-own)",
          time_minutes: 25,
          prep_type: "stovetop",
          kid_version: "plain beef, cheese, tortilla",
          adult_lighter_option: "lettuce wrap",
          notes: "",
        },
      }),
    );
    expect(withDinner.text).toContain("DINNER TONIGHT");
    expect(withDinner.text).toContain("- Tacos (build-your-own)");
    expect(withDinner.text).toContain("- Kids: plain beef, cheese, tortilla");
    expect(withDinner.text).toContain("- Adults (lighter): lettuce wrap");
    expect(withDinner.html).toContain("Tacos (build-your-own)");
  });
});
