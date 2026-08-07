import { describe, expect, it } from "vitest";
import { localDateKey, localMonthKey } from "./dates";

describe("localDateKey", () => {
  it("uses the Date object's own local calendar date, not its UTC date", () => {
    // 9:24pm on Aug 7 in a UTC-4 zone is 1:24am Aug 8 in UTC — a naive
    // toISOString().slice(0, 10) would wrongly say "2026-08-08" here.
    const date = new Date(2026, 7, 7, 21, 24);
    expect(localDateKey(date)).toBe("2026-08-07");
  });

  it("pads single-digit months and days", () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("localMonthKey", () => {
  it("returns YYYY-MM from the local calendar date", () => {
    const date = new Date(2026, 9, 31, 23, 59);
    expect(localMonthKey(date)).toBe("2026-10");
  });
});
