import { hasGroqKey, groqGenerateJson } from "@/lib/groq";
import { hasGeminiKey, geminiGenerateJson } from "@/lib/gemini";

const HF_ZERO_SHOT_API =
  "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli";

export type DomainClassification = {
  domain: string;
  confidence: number;
  difficulty: "Foundational" | "Standard" | "Advanced";
  suggestedChapters: string[];
  providerUsed: string;
};

const JEE_CANDIDATE_LABELS = [
  "Classical Mechanics & Newton's Laws",
  "Electromagnetism & Circuits",
  "Optics & Modern Physics",
  "Thermodynamics & Kinetic Theory",
  "Physical Chemistry & Chemical Kinetics",
  "Organic Chemistry & Reaction Mechanisms",
  "Inorganic Chemistry & Coordination Compounds",
  "Calculus & Differential Equations",
  "Algebra & Coordinate Geometry",
];

const NEET_CANDIDATE_LABELS = [
  "Human Physiology & Anatomy",
  "Genetics, Evolution & Molecular Biology",
  "Cell Structure & Plant Physiology",
  "Ecology & Environment",
  "Organic Chemistry & Biomolecules",
  "Inorganic Chemistry & Periodic Properties",
  "Physics: Mechanics & Laws of Motion",
  "Physics: Optics, Waves & Thermodynamics",
];

/**
 * Classifies student answer / question domain using HuggingFace Zero-Shot Classification
 * with automatic fallback to Groq or Gemini.
 */
export async function classifySubjectDomain(
  text: string,
  stream: "JEE" | "NEET" = "JEE"
): Promise<DomainClassification> {
  const candidateLabels = stream === "JEE" ? JEE_CANDIDATE_LABELS : NEET_CANDIDATE_LABELS;
  const token = process.env.HF_TOKEN;

  // 1. Try Hugging Face Zero-Shot Classification
  if (token) {
    try {
      const res = await fetch(HF_ZERO_SHOT_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: text.slice(0, 1000),
          parameters: { candidate_labels: candidateLabels },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.labels && data.scores && data.labels.length > 0) {
          const topDomain = data.labels[0];
          const topScore = Number(data.scores[0]) || 0.85;

          return {
            domain: topDomain,
            confidence: Math.round(topScore * 100) / 100,
            difficulty: topScore > 0.6 ? "Standard" : "Advanced",
            suggestedChapters: [topDomain],
            providerUsed: "Hugging Face (bart-large-mnli)",
          };
        }
      }
    } catch (err) {
      console.warn("[PrepForge:hfClassification] Hugging Face zero-shot failed:", err);
    }
  }

  // 2. High-speed Multi-Model Routing: Groq fallback
  if (hasGroqKey()) {
    try {
      const prompt = `Classify the following ${stream} academic response into its primary subject domain and difficulty level.
Text:
${text.slice(0, 1500)}

Candidate domains:
${candidateLabels.join(", ")}

Return valid JSON:
{
  "domain": string,
  "confidence": number (0.0 to 1.0),
  "difficulty": "Foundational" | "Standard" | "Advanced",
  "suggestedChapters": string[]
}`;

      const { data, modelUsed } = await groqGenerateJson<{
        domain: string;
        confidence: number;
        difficulty: "Foundational" | "Standard" | "Advanced";
        suggestedChapters: string[];
      }>(prompt);

      return {
        domain: data.domain || candidateLabels[0],
        confidence: data.confidence || 0.9,
        difficulty: data.difficulty || "Standard",
        suggestedChapters: data.suggestedChapters || [data.domain],
        providerUsed: `Groq (${modelUsed})`,
      };
    } catch (groqErr) {
      console.warn("[PrepForge:hfClassification] Groq classification failed:", groqErr);
    }
  }

  // 3. Fallback: Google Gemini
  if (hasGeminiKey()) {
    try {
      const prompt = `Classify the following ${stream} academic response into its primary domain.
Text: ${text.slice(0, 1500)}
Candidate domains: ${candidateLabels.join(", ")}
Return JSON with domain (string), confidence (number), difficulty ("Foundational"|"Standard"|"Advanced"), suggestedChapters (string[])`;

      const data = await geminiGenerateJson<{
        domain: string;
        confidence: number;
        difficulty: "Foundational" | "Standard" | "Advanced";
        suggestedChapters: string[];
      }>(prompt);

      return {
        domain: data.domain || candidateLabels[0],
        confidence: data.confidence || 0.85,
        difficulty: data.difficulty || "Standard",
        suggestedChapters: data.suggestedChapters || [data.domain],
        providerUsed: "Google Gemini",
      };
    } catch (geminiErr) {
      console.warn("[PrepForge:hfClassification] Gemini classification failed:", geminiErr);
    }
  }

  // Default fallback
  return {
    domain: candidateLabels[0],
    confidence: 0.7,
    difficulty: "Standard",
    suggestedChapters: [candidateLabels[0]],
    providerUsed: "Deterministic Rule Engine",
  };
}
