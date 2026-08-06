import { describe, expect, it } from "vitest";
import { matchBriefRules, type RuleLike, type ScheduleItem } from "./ruleMatcher";

const peJosh: RuleLike = { keyword: "PE", kid: "Josh", wearNote: "sneakers", dinnerFlag: null };
const fieldTrip: RuleLike = {
  keyword: "field trip",
  kid: null,
  wearNote: "check permission slip",
  dinnerFlag: null,
};

function item(overrides: Partial<ScheduleItem>): ScheduleItem {
  return { id: "1", title: "", date: "2026-08-06", source: "recurring", ...overrides };
}

describe("matchBriefRules", () => {
  it("matches a kid-scoped rule when the item is tagged with that kid", () => {
    const matches = matchBriefRules([item({ title: "PE", kid: "Josh" })], [peJosh]);
    expect(matches).toHaveLength(1);
    expect(matches[0].rule.wearNote).toBe("sneakers");
  });

  it("does not match a kid-scoped rule for a different kid", () => {
    const matches = matchBriefRules([item({ title: "PE", kid: "Riley" })], [peJosh]);
    expect(matches).toHaveLength(0);
  });

  it("falls back to matching the kid's name in the title when the item has no kid field", () => {
    const matches = matchBriefRules(
      [item({ title: "Josh - PE", kid: null, source: "calendar" })],
      [peJosh],
    );
    expect(matches).toHaveLength(1);
  });

  it("applies an unscoped rule to any kid", () => {
    const matches = matchBriefRules(
      [
        item({ title: "Field Trip - Zoo", kid: "Riley", source: "calendar" }),
        item({ title: "Regular day", kid: "Josh" }),
      ],
      [fieldTrip],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].item.kid).toBe("Riley");
  });
});
