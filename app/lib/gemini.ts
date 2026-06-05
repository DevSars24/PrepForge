import { GoogleGenerativeAI, type Part } from "@google/generative-ai";

const FLASH = "gemini-1.5-flash";
const EMBED = "text-embedding-004";

export function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

export function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function geminiGenerateJson<T>(prompt: string, parts: Part[] = []): Promise<T> {
  const client = getGeminiClient();
  if (!client) throw new Error("GEMINI_API_KEY is not configured");

  const model = client.getGenerativeModel({
    model: FLASH,
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  });

  const result = await Promise.race([
    model.generateContent([...parts, { text: prompt }]),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Gemini request timed out")), 45000);
    }),
  ]);

  const text = result.response.text()?.trim();
  if (!text) throw new Error("Empty Gemini response");
  return JSON.parse(text) as T;
}

export async function geminiGenerateText(prompt: string, parts: Part[] = []): Promise<string> {
  const client = getGeminiClient();
  if (!client) throw new Error("GEMINI_API_KEY is not configured");

  const model = client.getGenerativeModel({
    model: FLASH,
    generationConfig: { temperature: 0 },
  });

  const result = await Promise.race([
    model.generateContent([...parts, { text: prompt }]),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Gemini request timed out")), 45000);
    }),
  ]);

  const text = result.response.text()?.trim();
  if (!text) throw new Error("Empty Gemini response");
  return text;
}

export async function geminiEmbed(text: string): Promise<number[]> {
  const client = getGeminiClient();
  if (!client) throw new Error("GEMINI_API_KEY is not configured");

  const model = client.getGenerativeModel({ model: EMBED });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export function imagePart(base64: string, mimeType: string): Part {
  return { inlineData: { data: base64, mimeType } };
}

export async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return {
    base64: buffer.toString("base64"),
    mimeType: file.type || "application/octet-stream",
  };
}
