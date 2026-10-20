import { PrepForgeError, normalizeError, withTimeout } from "@/lib/debug";

const GROQ_TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS || 45000);
const DEFAULT_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const FALLBACK_MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];

export function hasGroqKey(): boolean {
  return Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0);
}

export function getGroqKey(): string {
  return process.env.GROQ_API_KEY || "";
}

type GroqChatOptions = {
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

/**
 * Clean potential markdown wrappers from JSON string returned by LLMs
 */
function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

/**
 * Execute chat completion on Groq with automatic model fallback
 */
async function callGroqChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options: GroqChatOptions = {},
  isJson = false
): Promise<{ content: string; modelUsed: string }> {
  const apiKey = getGroqKey();
  if (!apiKey) {
    throw new PrepForgeError({
      kind: "api_error",
      component: "groq.callGroqChat",
      message: "GROQ_API_KEY is not configured",
      statusCode: 503,
    });
  }

  const candidateModels = [
    options.model || DEFAULT_MODEL,
    ...FALLBACK_MODELS.filter((m) => m !== (options.model || DEFAULT_MODEL)),
  ];

  let lastError: unknown = null;

  for (const model of candidateModels) {
    try {
      const response = await withTimeout(
        fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: options.temperature ?? 0.1,
            max_tokens: options.maxTokens ?? 4096,
            ...(isJson ? { response_format: { type: "json_object" } } : {}),
          }),
        }),
        GROQ_TIMEOUT_MS,
        "groq.callGroqChat",
        { model, messageCount: messages.length }
      );

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        // If 404/model not found or 429 rate limit, try next model
        if (response.status === 404 || response.status === 429 || response.status === 400) {
          console.warn(`[Groq] Model ${model} returned ${response.status}, trying fallback...`, errorBody.slice(0, 200));
          lastError = new Error(`Groq HTTP ${response.status}: ${errorBody}`);
          continue;
        }
        throw new PrepForgeError({
          kind: "api_error",
          component: "groq.callGroqChat",
          message: `Groq API returned HTTP ${response.status}: ${errorBody.slice(0, 500)}`,
          statusCode: response.status,
        });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();

      if (!content) {
        throw new PrepForgeError({
          kind: "invalid_response",
          component: "groq.callGroqChat",
          message: `Groq returned empty completion content from model ${model}`,
          response: data,
        });
      }

      return { content, modelUsed: model };
    } catch (err) {
      lastError = err;
      console.warn(`[Groq] Attempt with model ${model} failed:`, err instanceof Error ? err.message : err);
    }
  }

  throw normalizeError(lastError, {
    kind: "api_error",
    component: "groq.callGroqChat",
  });
}

/**
 * Generate structured JSON from Groq with schema adherence
 */
export async function groqGenerateJson<T>(
  prompt: string,
  options: GroqChatOptions = {}
): Promise<{ data: T; modelUsed: string }> {
  const systemPrompt =
    options.systemPrompt ||
    "You are an expert academic evaluator. You must return your response as a valid, well-formed JSON object matching the requested schema. Return JSON ONLY with no commentary or markdown outside the JSON.";

  const messages: Array<{ role: "system" | "user"; content: string }> = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ];

  const { content, modelUsed } = await callGroqChat(messages, options, true);
  const cleaned = cleanJsonString(content);

  try {
    const data = JSON.parse(cleaned) as T;
    return { data, modelUsed };
  } catch (parseErr) {
    throw new PrepForgeError({
      kind: "parsing_error",
      component: "groq.groqGenerateJson",
      message: `Failed to parse Groq JSON response: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
      response: content.slice(0, 3000),
      cause: parseErr,
    });
  }
}

/**
 * Generate plain text or Markdown from Groq
 */
export async function groqGenerateText(
  prompt: string,
  options: GroqChatOptions = {}
): Promise<{ text: string; modelUsed: string }> {
  const messages: Array<{ role: "system" | "user"; content: string }> = [];

  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const { content, modelUsed } = await callGroqChat(messages, options, false);
  return { text: content, modelUsed };
}
