import { GoogleGenerativeAI, type Part, type Schema } from "@google/generative-ai";

export const FLASH_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const EMBED = "text-embedding-004";

async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries <= 0) throw error;
    const errorMessage = error?.message || String(error);
    const isClientError =
      errorMessage.includes("400") ||
      errorMessage.includes("API_KEY") ||
      errorMessage.includes("not configured");
    if (isClientError) throw error;

    console.warn(`Gemini API error. Retrying in ${delay}ms... Details: ${errorMessage}`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryWithExponentialBackoff(fn, retries - 1, delay * 2);
  }
}

export function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

export function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function geminiGenerateJson<T>(
  prompt: string,
  parts: Part[] = [],
  schema?: Schema
): Promise<T> {
  const client = getGeminiClient();
  if (!client) throw new Error("GEMINI_API_KEY is not configured");

  const model = client.getGenerativeModel({
    model: FLASH_MODEL,
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  return retryWithExponentialBackoff(async () => {
    const result = await Promise.race([
      model.generateContent([...parts, { text: prompt }]),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Gemini request timed out")), 45000);
      }),
    ]);

    const text = result.response.text()?.trim();
    if (!text) throw new Error("Empty Gemini response");
    return JSON.parse(text) as T;
  });
}

export async function geminiGenerateText(prompt: string, parts: Part[] = []): Promise<string> {
  const client = getGeminiClient();
  if (!client) throw new Error("GEMINI_API_KEY is not configured");

  const model = client.getGenerativeModel({
    model: FLASH_MODEL,
    generationConfig: { temperature: 0 },
  });

  return retryWithExponentialBackoff(async () => {
    const result = await Promise.race([
      model.generateContent([...parts, { text: prompt }]),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Gemini request timed out")), 45000);
      }),
    ]);

    const text = result.response.text()?.trim();
    if (!text) throw new Error("Empty Gemini response");
    return text;
  });
}

export async function geminiEmbed(text: string): Promise<number[]> {
  const client = getGeminiClient();
  if (!client) throw new Error("GEMINI_API_KEY is not configured");

  const model = client.getGenerativeModel({ model: EMBED });
  
  return retryWithExponentialBackoff(async () => {
    const result = await model.embedContent(text);
    return result.embedding.values;
  });
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

