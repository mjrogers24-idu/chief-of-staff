import { describe, expect, it } from "vitest";
import { composeFollowUpPrompt, parseFollowUpResponse, type InboxMessage } from "./emailFollowUps";

const messages: InboxMessage[] = [
  { id: "m1", from: "Kayla <kayla@example.com>", subject: "Re: field trip", snippet: "Just checking...", receivedAt: "Fri, 7 Aug 2026 10:00:00 -0400" },
  { id: "m2", from: "Newsletter <news@example.com>", subject: "This week's deals", snippet: "50% off...", receivedAt: "Fri, 7 Aug 2026 09:00:00 -0400" },
];

describe("composeFollowUpPrompt", () => {
  it("includes each message's id, from, subject, and snippet", () => {
    const prompt = composeFollowUpPrompt(messages);
    expect(prompt).toContain("[id=m1]");
    expect(prompt).toContain("Kayla <kayla@example.com>");
    expect(prompt).toContain("Re: field trip");
    expect(prompt).toContain("Just checking...");
  });
});

describe("parseFollowUpResponse", () => {
  it("parses a well-formed array and matches ids back to messages", () => {
    const raw = JSON.stringify([{ id: "m1", reason: "Needs a reply about the field trip" }]);
    const suggestions = parseFollowUpResponse(raw, messages);
    expect(suggestions).toEqual([
      {
        messageId: "m1",
        from: "Kayla <kayla@example.com>",
        subject: "Re: field trip",
        reason: "Needs a reply about the field trip",
        receivedAt: "Fri, 7 Aug 2026 10:00:00 -0400",
      },
    ]);
  });

  it("strips a markdown code fence before parsing", () => {
    const fenced = '```json\n[{"id":"m1","reason":"Needs a reply"}]\n```';
    expect(parseFollowUpResponse(fenced, messages)).toHaveLength(1);
  });

  it("drops entries referencing an unknown message id", () => {
    const raw = JSON.stringify([{ id: "unknown", reason: "Needs a reply" }]);
    expect(parseFollowUpResponse(raw, messages)).toEqual([]);
  });

  it("drops entries missing or with an empty reason", () => {
    const raw = JSON.stringify([
      { id: "m1", reason: "" },
      { id: "m2" },
    ]);
    expect(parseFollowUpResponse(raw, messages)).toEqual([]);
  });

  it("returns an empty array when nothing needs follow-up", () => {
    expect(parseFollowUpResponse("[]", messages)).toEqual([]);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseFollowUpResponse("not json", messages)).toThrow(/not valid JSON/);
  });

  it("throws when the response isn't an array", () => {
    expect(() => parseFollowUpResponse(JSON.stringify({ foo: "bar" }), messages)).toThrow(/not a JSON array/);
  });
});
