import { PrepForgeError } from "@/lib/debug";

const HF_LLM_API =
  "https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.2";

/**
 * Generate a strengths/gaps analysis using HuggingFace Inference API
 * with Mistral-7B-Instruct. Returns plain text analysis.
 */
export async function generateAnalysis(
  evaluationResult: Record<string, unknown>
): Promise<string> {
  const token = process.env.HF_TOKEN;
  if (!token) {
    return "Analysis unavailable — HF_TOKEN not configured. Please review manually.";
  }

  const prompt = `<s>[INST] You are a JEE/NEET academic counselor. Based on this evaluation result, give:
1. Top 3 weak areas with exact NCERT chapter names
2. Top 3 strong areas
3. A revision plan with PYQ count per chapter

Evaluation:
${JSON.stringify(evaluationResult, null, 2).slice(0, 3000)}

Reply in plain text, structured with headings. [/INST]`;

  try {
    const res = await fetch(HF_LLM_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 500, return_full_text: false },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(
        `[PrepForge:hfAnalysis] HuggingFace LLM returned ${res.status}: ${errText.slice(0, 300)}`
      );
      if (res.status === 401) {
        return "Analysis unavailable — The HF_TOKEN in your .env is invalid or expired (401 Unauthorized). Please check your token.";
      }
      return "Analysis temporarily unavailable. The AI model is warming up — please try again in a few minutes, or review manually.";
    }

    const data = await res.json();
    if (Array.isArray(data) && data[0]?.generated_text) {
      return data[0].generated_text;
    }

    return "Analysis unavailable. Please review manually.";
  } catch (error) {
    console.warn("[PrepForge:hfAnalysis] Failed to generate analysis:", error);
    return "Analysis temporarily unavailable due to a network error. Please review manually.";
  }
}
