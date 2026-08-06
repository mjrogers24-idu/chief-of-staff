import { describe, expect, it } from "vitest";
import { composeBriefEmail } from "./emailBrief";
import type { DailyBrief } from "./dailyIngestion";

function brief(overrides: Partial<DailyBrief>): DailyBrief {
  return { date: "2026-08-06", scheduleItems: [], actions: [], ...overrides };
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
});
