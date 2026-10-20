import { hasGroqKey, groqGenerateText } from "@/lib/groq";
import { hasGeminiKey, geminiGenerateText } from "@/lib/gemini";

const HF_ROUTER_LLM_API =
  "https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.2";

/**
 * Generate a strengths/gaps analysis using HuggingFace Inference API,
 * with automatic high-speed failover to Groq or Gemini.
 */
export async function generateAnalysis(
  evaluationResult: Record<string, unknown>
): Promise<string> {
  const prompt = `You are a premier JEE/NEET academic counselor and mentor.
Based on this evaluation result, generate a comprehensive diagnostic report:
1. Top 3 weak areas with exact NCERT chapter names
2. Top 3 strong areas demonstrated by the student
3. A strategic revision plan with recommended PYQ (Previous Year Questions) practice count per chapter

Evaluation Data:
${JSON.stringify(evaluationResult, null, 2).slice(0, 3000)}

Reply in structured, clear plain text with clean headings (Markdown format).`;

  // 1. Try Hugging Face Inference API if token is configured
  const token = process.env.HF_TOKEN;
  if (token) {
    try {
      const hfPrompt = `<s>[INST] ${prompt} [/INST]`;
      const res = await fetch(HF_ROUTER_LLM_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: hfPrompt,
          parameters: { max_new_tokens: 600, return_full_text: false },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data[0]?.generated_text?.trim()) {
          return `[Generated via Hugging Face Mistral-7B]\n\n${data[0].generated_text.trim()}`;
        }
      } else {
        const errText = await res.text().catch(() => "");
        console.warn(
          `[PrepForge:hfAnalysis] HuggingFace LLM returned ${res.status}: ${errText.slice(0, 200)}, routing to Groq/Gemini fallback...`
        );
      }
    } catch (hfErr) {
      console.warn("[PrepForge:hfAnalysis] HuggingFace request error, routing to fallback:", hfErr);
    }
  }

  // 2. High-speed Multi-Model Routing: Groq fallback (openai/gpt-oss-120b)
  if (hasGroqKey()) {
    try {
      const groqRes = await groqGenerateText(prompt, {
        systemPrompt: "You are a top JEE/NEET academic counselor and mentor. Provide actionable NCERT-aligned feedback.",
      });
      if (groqRes.text?.trim()) {
        return `[Generated via Groq Fast Routing (${groqRes.modelUsed})]\n\n${groqRes.text.trim()}`;
      }
    } catch (groqErr) {
      console.warn("[PrepForge:hfAnalysis] Groq fallback failed, routing to Gemini:", groqErr);
    }
  }

  // 3. Fallback: Google Gemini
  if (hasGeminiKey()) {
    try {
      const geminiText = await geminiGenerateText(prompt);
      if (geminiText?.trim()) {
        return `[Generated via Google Gemini]\n\n${geminiText.trim()}`;
      }
    } catch (geminiErr) {
      console.warn("[PrepForge:hfAnalysis] Gemini fallback failed:", geminiErr);
    }
  }

  return "Academic Analysis temporarily unavailable. Please review student answers against the rubric.";
}
