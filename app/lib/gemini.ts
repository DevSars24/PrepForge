import { GoogleGenerativeAI, type Part, type Schema } from "@google/generative-ai";
import { PrepForgeError, normalizeError, withTimeout } from "@/lib/debug";

export const FLASH_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const EMBED = "text-embedding-004";
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 45000);

async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    if (retries <= 0) throw error;
    const normalized = normalizeError(error, { kind: "gemini_error", component: "retryWithExponentialBackoff" });
    const errorMessage = normalized.message;
    const isClientError =
      normalized.kind === "timeout" ||
      errorMessage.includes("400") ||
      errorMessage.includes("401") ||
      errorMessage.includes("403") ||
      errorMessage.includes("API_KEY") ||
      errorMessage.toLowerCase().includes("api key") ||
      errorMessage.includes("not configured");
    if (isClientError) throw error;

    console.warn(`Gemini API error. Retrying in ${delay}ms...`, normalized);
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
  if (!client) {
    throw new PrepForgeError({
      kind: "gemini_error",
      component: "geminiGenerateJson",
      message: "GEMINI_API_KEY is not configured",
      statusCode: 503,
    });
  }

  const model = client.getGenerativeModel({
    model: FLASH_MODEL,
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  return retryWithExponentialBackoff(async () => {
    const result = await withTimeout(
      model.generateContent([...parts, { text: prompt }]),
      GEMINI_TIMEOUT_MS,
      "geminiGenerateJson",
      { model: FLASH_MODEL, promptChars: prompt.length, parts: parts.length }
    );

    const text = result.response.text()?.trim();
    if (!text) {
      throw new PrepForgeError({
        kind: "invalid_response",
        component: "geminiGenerateJson",
        message: "Empty Gemini response",
        request: { model: FLASH_MODEL, promptChars: prompt.length, parts: parts.length },
        response: result.response,
      });
    }

    try {
      return JSON.parse(text) as T;
    } catch (error) {
      throw new PrepForgeError({
        kind: "parsing_error",
        component: "geminiGenerateJson",
        message: `Malformed Gemini JSON response: ${error instanceof Error ? error.message : String(error)}`,
        request: { model: FLASH_MODEL, promptChars: prompt.length, parts: parts.length },
        response: text.slice(0, 4000),
        cause: error,
      });
    }
  });
}

export async function geminiGenerateText(prompt: string, parts: Part[] = []): Promise<string> {
  const client = getGeminiClient();
  if (!client) {
    throw new PrepForgeError({
      kind: "gemini_error",
      component: "geminiGenerateText",
      message: "GEMINI_API_KEY is not configured",
      statusCode: 503,
    });
  }

  const model = client.getGenerativeModel({
    model: FLASH_MODEL,
    generationConfig: { temperature: 0 },
  });

  return retryWithExponentialBackoff(async () => {
    const result = await withTimeout(
      model.generateContent([...parts, { text: prompt }]),
      GEMINI_TIMEOUT_MS,
      "geminiGenerateText",
      { model: FLASH_MODEL, promptChars: prompt.length, parts: parts.length }
    );

    const text = result.response.text()?.trim();
    if (!text) {
      throw new PrepForgeError({
        kind: "invalid_response",
        component: "geminiGenerateText",
        message: "Empty Gemini response",
        request: { model: FLASH_MODEL, promptChars: prompt.length, parts: parts.length },
        response: result.response,
      });
    }
    return text;
  });
}

export async function geminiEmbed(text: string): Promise<number[]> {
  const client = getGeminiClient();
  if (!client) {
    throw new PrepForgeError({
      kind: "gemini_error",
      component: "geminiEmbed",
      message: "GEMINI_API_KEY is not configured",
      statusCode: 503,
    });
  }

  const model = client.getGenerativeModel({ model: EMBED });
  
  return retryWithExponentialBackoff(async () => {
    const result = await withTimeout(
      model.embedContent(text),
      GEMINI_TIMEOUT_MS,
      "geminiEmbed",
      { model: EMBED, textChars: text.length }
    );
    return result.embedding.values;
  });
}

export function imagePart(base64: string, mimeType: string): Part {
  return { inlineData: { data: base64, mimeType } };
}

export async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  const mimeType = file.type || inferMimeType(file.name);
  if (!isSupportedScanMimeType(mimeType)) {
    throw new PrepForgeError({
      kind: "file_upload_error",
      component: "fileToBase64",
      message: `Unsupported file type for "${file.name || "uploaded file"}": ${mimeType}`,
      statusCode: 400,
      request: { fileName: file.name, fileSize: file.size, mimeType },
    });
  }

  const maxBytes = 12 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new PrepForgeError({
      kind: mimeType === "application/pdf" ? "pdf_scan_error" : "file_upload_error",
      component: "fileToBase64",
      message: `File "${file.name}" is too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum supported upload is 12MB.`,
      statusCode: 413,
      request: { fileName: file.name, fileSize: file.size, mimeType },
    });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!buffer.length) {
    throw new PrepForgeError({
      kind: "file_upload_error",
      component: "fileToBase64",
      message: `File "${file.name}" is empty and cannot be scanned.`,
      statusCode: 400,
      request: { fileName: file.name, fileSize: file.size, mimeType },
    });
  }

  return {
    base64: buffer.toString("base64"),
    mimeType,
  };
}

export function isSupportedScanMimeType(mimeType: string) {
  return ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(mimeType);
}

function inferMimeType(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "pdf") return "application/pdf";
  return "application/octet-stream";
}

