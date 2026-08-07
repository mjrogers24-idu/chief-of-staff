import { describe, expect, it } from "vitest";
import { composeRecipeUploadPrompt, parseRecipeUploadResponse } from "./recipeUpload";

describe("composeRecipeUploadPrompt", () => {
  it("describes the expected JSON shape", () => {
    const prompt = composeRecipeUploadPrompt();
    expect(prompt).toContain("title");
    expect(prompt).toContain("ingredients");
    expect(prompt).toContain("instructions");
  });
});

describe("parseRecipeUploadResponse", () => {
  it("parses a well-formed recipe", () => {
    const raw = JSON.stringify({
      title: "Million Dollar Spaghetti",
      ingredients: ["1 lb spaghetti", "1 lb ground beef", "24 oz marinara"],
      instructions: "1. Boil pasta. 2. Brown beef. 3. Layer and bake at 350 for 30 min.",
    });
    expect(parseRecipeUploadResponse(raw)).toEqual({
      title: "Million Dollar Spaghetti",
      ingredients: ["1 lb spaghetti", "1 lb ground beef", "24 oz marinara"],
      instructions: "1. Boil pasta. 2. Brown beef. 3. Layer and bake at 350 for 30 min.",
    });
  });

  it("strips a markdown code fence before parsing", () => {
    const fenced = '```json\n{"title":"Tacos","ingredients":["shells"],"instructions":"Fill and fold."}\n```';
    expect(parseRecipeUploadResponse(fenced)).toEqual({
      title: "Tacos",
      ingredients: ["shells"],
      instructions: "Fill and fold.",
    });
  });

  it("falls back to defaults for missing fields instead of failing", () => {
    expect(parseRecipeUploadResponse(JSON.stringify({}))).toEqual({
      title: "Untitled recipe",
      ingredients: [],
      instructions: "",
    });
  });

  it("drops non-string entries from the ingredients array", () => {
    const raw = JSON.stringify({ title: "Soup", ingredients: ["broth", 5, "", "carrots"], instructions: "" });
    expect(parseRecipeUploadResponse(raw).ingredients).toEqual(["broth", "carrots"]);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseRecipeUploadResponse("not json")).toThrow(/not valid JSON/);
  });

  it("throws when the response isn't an object", () => {
    expect(() => parseRecipeUploadResponse(JSON.stringify(["a", "b"]))).toThrow(/not an object/);
  });
});
