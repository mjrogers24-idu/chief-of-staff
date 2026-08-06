import { GoogleGenAI } from "@google/genai";

// Confirm this is still current when deploying — Gemini model names roll
// over periodically.
const MODEL = "gemini-2.5-flash";

export async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}
