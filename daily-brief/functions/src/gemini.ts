import { GoogleGenAI } from "@google/genai";

// A rolling alias (always the current recommended Flash model) rather
// than a pinned version like "gemini-2.5-flash" — that pinned name was
// retired for new API keys well before its official shutdown date and
// broke every Gemini call in this app with a 404. Using -latest trades a
// small amount of behavior stability for not having to notice and update
// this string every time Google rolls the lineup.
const MODEL = "gemini-flash-latest";

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

export interface GeminiImage {
  base64Data: string;
  mimeType: string;
}

export async function callGeminiVision(prompt: string, images: GeminiImage[]): Promise<string> {
  const response = await client().models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          ...images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.base64Data } })),
        ],
      },
    ],
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}
