import { GoogleGenAI } from "@google/genai";

// Confirm this is still current when deploying — Gemini model names roll
// over periodically.
const MODEL = "gemini-2.5-flash";

function client(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey });
}

export async function callGemini(prompt: string): Promise<string> {
  const response = await client().models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

export async function callGeminiVision(
  prompt: string,
  base64Data: string,
  mimeType: string,
): Promise<string> {
  const response = await client().models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Data } }],
      },
    ],
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}
