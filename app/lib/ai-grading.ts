import { geminiGenerateJson, geminiGenerateText, imagePart, FLASH_MODEL, hasGeminiKey } from "@/lib/gemini";
import { mistralOCR, hasMistralKey } from "@/lib/mistralOCR";
import { getTopRubricChunks, hasHfToken } from "@/lib/hfEmbeddings";
import { hasGroqKey, groqGenerateJson } from "@/lib/groq";
import { parseDocumentWithMarker, hasMarkerKey } from "@/lib/marker";
import type { EvaluationResult, Student, Stream, StepGrade } from "@/lib/evaluation";
import { SchemaType, type Schema } from "@google/generative-ai";
import { PrepForgeError, logDebugError, normalizeError } from "@/lib/debug";
import {
  normalizeRawGrading,
  validateGradingResponse,
  type GradingResponse,
} from "@/lib/gradingSchema";
import { sanitizeMath, sanitizeMathRecursive } from "@/lib/sanitizeMath";
import {
  applyGuardrailsToGradingResponse,
  checkDeductionValidity,
} from "@/lib/gradingGuardrails";

export type ImageInput = { base64: string; mimeType: string; name?: string };

export type AiStepGrade = {
  rubricId: string;
  topic: string;
  expected: string;
  awarded: number;
  max: number;
  confidence: number;
  status: "earned" | "partial" | "review";
  reasoning: string;
  note: string;
  evidenceQuote: string;
  citationSource: string;
  // Guardrail enhancements
  question_no?: string;
  section?: string;
  rubric_breakdown?: Array<{ criterion: string; awarded: number; max: number; met: boolean }>;
  errors?: Array<{ step: string; student_wrote: string; expected: string }>;
  student_final_answer?: string;
  expected_final_answer?: string;
  needs_review?: boolean;
};

export type AiGradingPayload = GradingResponse & {
  stepGrades?: AiStepGrade[];
};

type OmrVisionPayload = {
  answers: string[];
  anomalies: string[];
  notes: string;
};

/**
 * Gemini Structured Schema for Question Evaluation
 */
const structuredGradingGeminiSchema: Schema = {
  type: SchemaType.OBJECT,
  description: "Chain-of-thought structured evaluation of student answer sheet with plain-text math and guardrails.",
  properties: {
    questions: {
      type: SchemaType.ARRAY,
      description: "List of graded questions with detailed breakdown.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          question_no: { type: SchemaType.STRING, description: "e.g. Q20, Q21" },
          section: { type: SchemaType.STRING, description: "Section name, e.g. Section B" },
          topic: { type: SchemaType.STRING, description: "Question topic or concept" },
          marks_awarded: { type: SchemaType.NUMBER, description: "Marks awarded" },
          marks_max: { type: SchemaType.NUMBER, description: "Max marks" },
          rubric_breakdown: {
            type: SchemaType.ARRAY,
            description: "Breakdown of individual rubric criteria",
            items: {
              type: SchemaType.OBJECT,
              properties: {
                criterion: { type: SchemaType.STRING },
                awarded: { type: SchemaType.NUMBER },
                max: { type: SchemaType.NUMBER },
                met: { type: SchemaType.BOOLEAN },
              },
              required: ["criterion", "awarded", "max", "met"],
            },
          },
          errors: {
            type: SchemaType.ARRAY,
            description: "Concrete errors only when marks are deducted. Empty if full marks.",
            items: {
              type: SchemaType.OBJECT,
              properties: {
                step: { type: SchemaType.STRING },
                student_wrote: { type: SchemaType.STRING },
                expected: { type: SchemaType.STRING },
              },
              required: ["step", "student_wrote", "expected"],
            },
          },
          feedback: { type: SchemaType.STRING, description: "Maximum 2 sentences feedback" },
          student_final_answer: { type: SchemaType.STRING, description: "Plain text/Unicode final answer" },
          expected_final_answer: { type: SchemaType.STRING, description: "Plain text/Unicode expected final answer" },
          confidence: { type: SchemaType.NUMBER, description: "Confidence score 0.0 to 1.0" },
          needs_review: { type: SchemaType.BOOLEAN, description: "Flag for faculty review" },
          reasoning: { type: SchemaType.STRING, description: "Concise chain-of-thought reasoning" },
        },
        required: [
          "question_no",
          "section",
          "topic",
          "marks_awarded",
          "marks_max",
          "rubric_breakdown",
          "errors",
          "feedback",
          "student_final_answer",
          "expected_final_answer",
          "confidence",
          "needs_review",
          "reasoning",
        ],
      },
    },
    strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    weaknesses: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    topicGaps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    recommendations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    summary: { type: SchemaType.STRING },
    overallConfidence: { type: SchemaType.NUMBER },
  },
  required: [
    "questions",
    "strengths",
    "weaknesses",
    "topicGaps",
    "recommendations",
    "summary",
    "overallConfidence",
  ],
};

const omrVisionSchema: Schema = {
  type: SchemaType.OBJECT,
  description: "Structured extraction of marked options on an OMR bubble sheet.",
  properties: {
    answers: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Ordered options from Q1. Use 'A', 'B', 'C', 'D' for selected answers, '-' for blank, and '?' for double bubbles.",
    },
    anomalies: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Any double-filled options, faint marks, or unclear bubbles.",
    },
    notes: {
      type: SchemaType.STRING,
      description: "Readability and quality assessment notes.",
    },
  },
  required: ["answers", "anomalies", "notes"],
};

// ---------------------------------------------------------------------------
// Rubric Retrieval (RAG)
// ---------------------------------------------------------------------------

function chunkRubric(text: string, size = 1200): string[] {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .flatMap((block) => {
      if (block.length <= size) return [block];
      const lines: string[] = [];
      for (let i = 0; i < block.length; i += size) lines.push(block.slice(i, i + size));
      return lines;
    });
}

async function retrieveRubricContext(answerText: string, rubricText: string): Promise<string> {
  const chunks = chunkRubric(rubricText);
  if (!chunks.length) return rubricText;
  if (rubricText.length <= 6000) return rubricText;

  if (hasHfToken()) {
    try {
      const topChunks = await getTopRubricChunks(answerText, rubricText, 6);
      return topChunks.join("\n\n---\n\n");
    } catch (error) {
      logDebugError(normalizeError(error, { kind: "gemini_error", component: "retrieveRubricContext.hfEmbeddings" }));
    }
  }

  return chunks.slice(0, 6).join("\n\n---\n\n");
}

// ---------------------------------------------------------------------------
// OCR — multi-provider with Gemini Vision fallback
// ---------------------------------------------------------------------------

export async function ocrAnswerSheets(images: ImageInput[]): Promise<string> {
  if (!images.length) return "";

  if (hasMarkerKey()) {
    try {
      const results = await Promise.all(
        images.map(async (img) => {
          const buffer = Buffer.from(img.base64, "base64");
          const parsed = await parseDocumentWithMarker(
            buffer,
            img.name || (img.mimeType === "application/pdf" ? "sheet.pdf" : "sheet.png"),
            img.mimeType
          );
          return parsed.markdown;
        })
      );
      const combined = results.filter(Boolean).join("\n\n---\n\n");
      if (combined.trim()) return sanitizeMath(combined);
    } catch (markerErr) {
      console.warn("[PrepForge] Marker engine failed, falling back to Mistral OCR:", markerErr);
    }
  }

  if (hasMistralKey()) {
    try {
      const results = await Promise.all(
        images.map((img) => mistralOCR(img.base64, img.mimeType))
      );
      const text = results.filter(Boolean).join("\n\n");
      if (text.trim()) return sanitizeMath(text);
    } catch (err) {
      console.warn("[PrepForge] Mistral OCR failed, falling back to Gemini Vision:", err);
    }
  }

  try {
    const parts = images.map((img) => imagePart(img.base64, img.mimeType));
    const prompt = `You are an expert OCR system for handwritten academic answer sheets.
Carefully read every word, formula, equation, diagram label, and number on each page.
Output the text exactly as written by the student, preserving line breaks and structure.
Write math in plain text/Unicode (e.g. P = I × A, n = P / E, 10^4). Do NOT use LaTeX or $...$.
If any part is illegible, write [illegible] in place.
Do NOT paraphrase or interpret — transcribe faithfully.`;

    const text = await geminiGenerateText(prompt, parts);
    if (text.trim()) return sanitizeMath(text);
  } catch (err) {
    console.warn("[PrepForge] Gemini Vision OCR also failed:", err);
  }

  throw new PrepForgeError({
    kind: "gemini_error",
    component: "ocrAnswerSheets",
    message: "No OCR provider available or all providers failed. Set DATALAB_API_KEY, MISTRAL_API_KEY, or GEMINI_API_KEY in .env.",
    statusCode: 503,
  });
}

// ---------------------------------------------------------------------------
// OMR Vision
// ---------------------------------------------------------------------------

export async function ocrOmrSheet(images: ImageInput[]): Promise<OmrVisionPayload> {
  if (!images.length) {
    return { answers: [], anomalies: [], notes: "No OMR image provided." };
  }

  const parts = images.map((img) => imagePart(img.base64, img.mimeType));
  const prompt = `You are an OMR reader for JEE/NEET multiple-choice sheets.

TASK: Read every filled bubble on each question row, from Q1 to the last visible question.

INSTRUCTIONS:
1. Examine each row carefully — look for the darkest filled circle.
2. If a bubble is lightly shaded, consider it selected ONLY if it is clearly darker than the surrounding empty bubbles.
3. For double-filled rows, mark "?" and add to anomalies.
4. For blank/unmarked rows, mark "-".

OUTPUT FORMAT (JSON):
{
  "answers": ["A","B","C","D", ...],
  "anomalies": ["Q3 double bubble", "Q7 faint mark"],
  "notes": "short read quality note"
}

Rules:
- Use A, B, C, D for selected options
- Use "-" for blank/unmarked
- Use "?" for ambiguous/double bubbles
- One entry per question, in order starting Q1`.trim();

  const payload = await geminiGenerateJson<OmrVisionPayload>(prompt, parts, omrVisionSchema);
  if (!Array.isArray(payload.answers) || !Array.isArray(payload.anomalies) || typeof payload.notes !== "string") {
    throw new PrepForgeError({
      kind: "invalid_response",
      component: "ocrOmrSheet",
      message: "Gemini OMR response did not match the expected answers/anomalies/notes shape.",
      response: payload,
    });
  }
  return payload;
}

// ---------------------------------------------------------------------------
// Chain-of-Thought Grading with Structured Output & Guardrails
// ---------------------------------------------------------------------------

function buildGradingPrompt(params: {
  studentMeta: string;
  rubricContext: string;
  answerText: string;
  stream: Stream;
  validationErrorFeedback?: string;
}): string {
  return `You are PrepForge Faculty Evaluation AI for ${params.stream} (JEE/NEET).

ROLE: Evaluate the student's answer sheet against the marking rubric using step-by-step reasoning and strict guardrails.

STUDENT: ${params.studentMeta}

MARKING RUBRIC:
${params.rubricContext}

STUDENT ANSWER SHEET:
${params.answerText}

MATHEMATICAL NOTATION RULES (CRITICAL):
- Write all math in plain text/Unicode (e.g. P = I × A, n = P / E, 10^4, n_e = n_i^2 / n_h, m^-3, photons/s).
- Do NOT use LaTeX commands (\\times, \\frac, \\text, \\cdot) or $...$ delimiters.
- Use Unicode operators: ×, ÷, ·, ≠, ≤, ≥, ±, ², ³, ⁻¹, ⁻³, etc.

GRADING & GUARDRAIL RULES:
1. IDENTIFY & COMPARE: For each question, compare student steps with rubric criteria.
2. DEDUCTION RULE: If marks_awarded < marks_max, you MUST supply concrete non-empty errors:
   { "step": "Specific arithmetic step or formula", "student_wrote": "Exact student text", "expected": "Exact expected value" }
   NEVER give vague reasons like "calculation errors" or "mistake". If student calculations are numerically correct within 2%, do NOT deduct marks!
3. RUBRIC BREAKDOWN: Break each question into 2-4 criteria (e.g. Formula, Steps/Substitution, Final Answer & Units) with awarded and max marks.
4. CONFIDENCE: Set confidence (0.0 to 1.0). If handwriting or steps are unclear, set needs_review = true.
5. FEEDBACK: Max 2 clear sentences.

JSON OUTPUT STRUCTURE:
{
  "questions": [
    {
      "question_no": "Q20",
      "section": "Section B",
      "topic": "Short Answer - Modern Physics (Photons)",
      "marks_awarded": 2,
      "marks_max": 2,
      "rubric_breakdown": [
        { "criterion": "Formula (P = I × A, E = hc / λ)", "awarded": 1, "max": 1, "met": true },
        { "criterion": "Calculation & Units (n = 1.01e4 photons/s)", "awarded": 1, "max": 1, "met": true }
      ],
      "errors": [],
      "feedback": "Correct formula application and precise numerical calculation.",
      "student_final_answer": "1.01e4 photons/s",
      "expected_final_answer": "1.01e4 photons/s",
      "confidence": 0.95,
      "needs_review": false,
      "reasoning": "Student correctly calculated power and photon energy, yielding 1.01e4 photons/s."
    }
  ],
  "strengths": ["Formula substitution", "Unit notation"],
  "weaknesses": [],
  "topicGaps": [],
  "recommendations": ["Practice multi-step numerical problems."],
  "summary": "Overall good attempt with clear steps.",
  "overallConfidence": 0.9
}
${
  params.validationErrorFeedback
    ? `\n\nCRITICAL FIX REQUIRED (PREVIOUS ATTEMPT FAILED):\n${params.validationErrorFeedback}\nPlease correct the errors and strictly follow the JSON schema.`
    : ""
}`.trim();
}

export async function gradeWithGemini(params: {
  student: Student;
  answerText: string;
  rubricText: string;
  stream: Stream;
}): Promise<{ grading: GradingResponse; rubricContext: string; retrievalStage: string; providerUsed: string }> {
  const rubricContext = await retrieveRubricContext(params.answerText, params.rubricText);
  const retrievalStage = params.rubricText.length > 6000 ? "EMBED_RAG" : "FULL_RUBRIC";

  const studentMeta = [
    `Name: ${params.student.name}`,
    `Roll: ${params.student.roll}`,
    `Subject: ${params.student.subject}`,
    params.student.batch ? `Batch: ${params.student.batch}` : null,
    params.student.examType ? `Exam: ${params.student.examType}` : null,
    params.student.section ? `Section: ${params.student.section}` : null,
  ].filter(Boolean).join(" | ");

  const prompt = buildGradingPrompt({
    studentMeta,
    rubricContext,
    answerText: params.answerText,
    stream: params.stream,
  });

  async function executeGradingCall(currentPrompt: string): Promise<{ data: unknown; providerUsed: string }> {
    // 1. PRIMARY ROUTE: Groq high-speed structured inference
    if (hasGroqKey()) {
      try {
        const groqRes = await groqGenerateJson<Record<string, unknown>>(currentPrompt, {
          systemPrompt:
            "You are the PrepForge Faculty Evaluation AI. Return valid JSON only with plain-text math and concrete error details.",
        });
        if (groqRes && groqRes.data) {
          return {
            data: groqRes.data,
            providerUsed: `Groq (${groqRes.modelUsed})`,
          };
        }
      } catch (groqErr) {
        console.warn(
          "[PrepForge:ai-grading] Groq structured grading call failed, falling back to Gemini:",
          groqErr instanceof Error ? groqErr.message : groqErr
        );
      }
    }

    // 2. FALLBACK ROUTE: Google Gemini Generative AI with Schema
    if (hasGeminiKey()) {
      try {
        const geminiRes = await geminiGenerateJson<Record<string, unknown>>(
          currentPrompt,
          [],
          structuredGradingGeminiSchema
        );
        if (geminiRes) {
          return {
            data: geminiRes,
            providerUsed: `Google Gemini (${FLASH_MODEL})`,
          };
        }
      } catch (geminiErr) {
        console.warn("[PrepForge:ai-grading] Gemini fallback call failed:", geminiErr);
        throw geminiErr;
      }
    }

    throw new PrepForgeError({
      kind: "invalid_response",
      component: "gradeWithGemini",
      message: "No AI provider succeeded for structured grading. Verify GROQ_API_KEY or GEMINI_API_KEY.",
      statusCode: 503,
    });
  }

  // Initial Attempt
  let callResult = await executeGradingCall(prompt);
  let normalized = normalizeRawGrading(callResult.data);
  let validation = validateGradingResponse(normalized);

  // Check deduction rules
  let deductionIssue: string | undefined;
  for (const q of normalized.questions) {
    const dCheck = checkDeductionValidity(q);
    if (!dCheck.valid && dCheck.needsRetry) {
      deductionIssue = dCheck.reason;
      break;
    }
  }

  // If validation failed or deduction rule violated, retry once with feedback
  if (!validation.success || deductionIssue) {
    const errorDetails = [validation.error, deductionIssue].filter(Boolean).join("\n");
    console.warn("[PrepForge:ai-grading] First pass failed guardrail validation. Retrying once...", errorDetails);

    const retryPrompt = buildGradingPrompt({
      studentMeta,
      rubricContext,
      answerText: params.answerText,
      stream: params.stream,
      validationErrorFeedback: errorDetails,
    });

    try {
      const retryResult = await executeGradingCall(retryPrompt);
      callResult = retryResult;
      normalized = normalizeRawGrading(retryResult.data);
      validation = validateGradingResponse(normalized);
    } catch (retryErr) {
      console.warn("[PrepForge:ai-grading] Retry attempt encountered error, falling back to normalized pass:", retryErr);
    }
  }

  // If still failing after retry, mark questions needs_review = true instead of crashing
  if (!validation.success) {
    console.warn("[PrepForge:ai-grading] Validation issues persisted after retry; marking for faculty review.");
    normalized.questions = normalized.questions.map((q) => ({
      ...q,
      needs_review: true,
      confidence: Math.min(q.confidence, 0.65),
    }));
  }

  // Apply full Guardrail suite (sanitize math, numeric verification, quote grounding, marks consistency)
  const guardrailed = applyGuardrailsToGradingResponse(normalized, params.answerText);

  return {
    grading: guardrailed,
    rubricContext,
    retrievalStage,
    providerUsed: callResult.providerUsed,
  };
}

export const gradeWithMultiModelRouting = gradeWithGemini;

// ---------------------------------------------------------------------------
// Map AI grading → EvaluationResult (Rich Result Cards)
// ---------------------------------------------------------------------------

export function mapAiGradingToResult(
  grading: GradingResponse,
  student: Student,
  meta: { retrievalStage: string; ocrUsed: boolean; providerUsed?: string }
): EvaluationResult {
  const sanitized = sanitizeMathRecursive(grading);

  const stepGrades: StepGrade[] = (sanitized.questions || []).map((q, idx) => {
    const rubricId = q.question_no || `Q${idx + 1}`;
    const awarded = Math.min(q.marks_max, Math.max(0, q.marks_awarded));
    const max = Math.max(1, q.marks_max);

    let status: "earned" | "partial" | "review" = "earned";
    if (q.needs_review || q.confidence < 0.7) {
      status = "review";
    } else if (awarded < max) {
      status = awarded > 0 ? "partial" : "review";
    }

    return {
      rubricId,
      question_no: q.question_no || `Q${idx + 1}`,
      section: q.section || "Section B",
      topic: q.topic || `Question ${idx + 1}`,
      expected: q.expected_final_answer || "",
      awarded,
      max,
      confidence: q.confidence,
      status,
      note: q.feedback || "",
      feedback: q.feedback || "",
      reasoning: q.reasoning || "",
      student_final_answer: q.student_final_answer || "",
      expected_final_answer: q.expected_final_answer || "",
      needs_review: q.needs_review,
      rubric_breakdown: q.rubric_breakdown || [],
      errors: q.errors || [],
      teacher_override: q.teacher_override,
      citations: q.citations && q.citations.length > 0
        ? q.citations.map((c, cIdx) => ({
            id: c.id || `${rubricId}-E${cIdx + 1}`,
            source: c.source || "Student Answer",
            line: c.line || 1,
            excerpt: c.excerpt,
          }))
        : [],
    };
  });

  const descriptiveScore = stepGrades.reduce((sum, g) => sum + g.awarded, 0);
  const descriptiveTotal = Math.max(1, stepGrades.reduce((sum, g) => sum + g.max, 0));
  const score = Math.round((descriptiveScore / descriptiveTotal) * 100);
  const citations = stepGrades.flatMap((g) => g.citations);

  // Calculate Section-wise scores
  const sectionScores: Record<string, { awarded: number; max: number }> = {};
  for (const sg of stepGrades) {
    const sec = sg.section || "General";
    if (!sectionScores[sec]) {
      sectionScores[sec] = { awarded: 0, max: 0 };
    }
    sectionScores[sec].awarded += sg.awarded;
    sectionScores[sec].max += sg.max;
  }

  const needsReviewCount = stepGrades.filter((g) => g.needs_review || g.status === "review").length;

  return {
    score,
    total: 100,
    confidence: Math.max(0, Math.min(1, sanitized.overallConfidence ?? 0.85)),
    stepGrades,
    citations,
    omr: { score: 0, total: 0, items: [], anomalies: [] },
    strengths: sanitized.strengths?.length ? sanitized.strengths : ["Systematic working shown"],
    gaps: sanitized.topicGaps?.length ? sanitized.topicGaps : sanitized.weaknesses || [],
    recommendations: sanitized.recommendations?.length
      ? sanitized.recommendations
      : ["Practice multi-step numerical derivations."],
    retrievalTrace: [
      {
        stage: "MODEL_ROUTER",
        detail: `Multi-Model Routing: Evaluated via ${meta.providerUsed || "Groq (Fast Routing) with Gemini Fallback"}`,
      },
      {
        stage: "INGEST",
        detail: meta.ocrUsed
          ? "Answer sheet processed with multi-provider OCR with math sanitation."
          : "Typed answer text used.",
      },
      {
        stage: "RAG",
        detail:
          meta.retrievalStage === "EMBED_RAG"
            ? "Rubric chunks retrieved with semantic embeddings."
            : "Full rubric passed to grader.",
      },
      {
        stage: "COT_GUARDRAIL",
        detail: "Math verifier & plain-text math guardrail applied: 2% numeric tolerance, quote grounding, and structured validation.",
      },
    ],
    summary: sanitized.summary || `${student.name} evaluation completed with output guardrails.`,
    aiText: sanitized.summary,
    needsReviewCount,
    sectionScores,
  };
}
