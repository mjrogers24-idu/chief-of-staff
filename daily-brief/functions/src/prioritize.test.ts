import { describe, expect, it } from "vitest";
import { composePrioritizePrompt } from "./prioritize";

describe("composePrioritizePrompt", () => {
  it("includes today's date and each task with its due date", () => {
    const prompt = composePrioritizePrompt(
      [
        { title: "Call the dentist", dueDate: "2026-08-14" },
        { title: "Pick up dry cleaning", dueDate: null },
      ],
      "2026-08-10",
    );
    expect(prompt).toContain("2026-08-10");
    expect(prompt).toContain("Call the dentist (due 2026-08-14)");
    expect(prompt).toContain("Pick up dry cleaning (no due date)");
  });
});
