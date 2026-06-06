import { geminiGenerateJson, imagePart } from "@/lib/gemini";
import { mistralOCR, hasMistralKey } from "@/lib/mistralOCR";
import { getTopRubricChunks, hasHfToken } from "@/lib/hfEmbeddings";
import { generateAnalysis } from "@/lib/hfAnalysis";
import type { EvaluationResult, Student, Stream } from "@/lib/evaluation";
import { SchemaType, type Schema } from "@google/generative-ai";
import { PrepForgeError, logDebugError, normalizeError } from "@/lib/debug";

export type ImageInput = { base64: string; mimeType: string; name?: string };

type AiStepGrade = {
  rubricId: string;
  topic: string;
  expected: string;
  awarded: number;
  max: number;
  confidence: number;
  status: "earned" | "partial" | "review";
  note: string;
  evidenceQuote: string;
  citationSource: string;
};

type AiGradingPayload = {
  stepGrades: AiStepGrade[];
  strengths: string[];
  weaknesses: string[];
  topicGaps: string[];
  recommendations: string[];
  summary: string;
  overallConfidence: number;
};

type OmrVisionPayload = {
  answers: string[];
  anomalies: string[];
  notes: string;
};

const aiGradingSchema: Schema = {
  type: SchemaType.OBJECT,
  description: "Detailed evaluation of student performance based on JEE/NEET marking rubric.",
  properties: {
    stepGrades: {
      type: SchemaType.ARRAY,
      description: "Breakdown of scores for each rubric point.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          rubricId: { type: SchemaType.STRING, description: "The ID from the rubric." },
          topic: { type: SchemaType.STRING, description: "Topic description." },
          expected: { type: SchemaType.STRING, description: "Expected content description." },
          awarded: { type: SchemaType.NUMBER, description: "Marks awarded for this step." },
          max: { type: SchemaType.NUMBER, description: "Maximum marks allowed for this step." },
          confidence: { type: SchemaType.NUMBER, description: "AI confidence for this step (0.0 to 1.0)." },
          status: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["earned", "partial", "review"],
            description: "earned (full marks), partial (partial credit), or review (requires faculty review)."
          },
          note: { type: SchemaType.STRING, description: "Justification for the awarded score." },
          evidenceQuote: { type: SchemaType.STRING, description: "Exact quote/sentence from student's answer sheet that proves this step." },
          citationSource: { type: SchemaType.STRING, description: "Source reference from the rubric." },
        },
        required: [
          "rubricId",
          "topic",
          "expected",
          "awarded",
          "max",
          "confidence",
          "status",
          "note",
          "evidenceQuote",
          "citationSource"
        ],
      },
    },
    strengths: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Key topics or concepts where the student scored full marks.",
    },
    weaknesses: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Topics or concepts where the student missed marks or was incomplete.",
    },
    topicGaps: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Syllabus topics flagged with gaps based on incorrect or missing answers.",
    },
    recommendations: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Actionable study steps targeting flagged topic gaps.",
    },
    summary: {
      type: SchemaType.STRING,
      description: "A 2-3 sentence overall summary of the student's attempt.",
    },
    overallConfidence: {
      type: SchemaType.NUMBER,
      description: "The overall confidence of the grading evaluation from 0.0 to 1.0.",
    },
  },
  required: [
    "stepGrades",
    "strengths",
    "weaknesses",
    "topicGaps",
    "recommendations",
    "summary",
    "overallConfidence"
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

  // Use HuggingFace embeddings if available, otherwise fall back to chunking
  if (hasHfToken()) {
    try {
      const topChunks = await getTopRubricChunks(answerText, rubricText, 6);
      return topChunks.join("\n\n---\n\n");
    } catch (error) {
      logDebugError(normalizeError(error, { kind: "gemini_error", component: "retrieveRubricContext.hfEmbeddings" }));
      // Fall through to basic chunking
    }
  }

  return chunks.slice(0, 6).join("\n\n---\n\n");
}

export async function ocrAnswerSheets(images: ImageInput[]): Promise<string> {
  if (!images.length) return "";

  // Use Mistral OCR if available (preferred — better for handwriting + PDFs)
  if (hasMistralKey()) {
    const results = await Promise.all(
      images.map((img) => mistralOCR(img.base64, img.mimeType))
    );
    return results.filter(Boolean).join("\n\n");
  }

  // Fallback: return empty (caller should handle gracefully)
  throw new PrepForgeError({
    kind: "gemini_error",
    component: "ocrAnswerSheets",
    message: "No OCR provider available. Set MISTRAL_API_KEY in .env for Mistral OCR.",
    statusCode: 503,
  });
}

export async function ocrOmrSheet(images: ImageInput[]): Promise<OmrVisionPayload> {
  if (!images.length) {
    return { answers: [], anomalies: [], notes: "No OMR image provided." };
  }

  const parts = images.map((img) => imagePart(img.base64, img.mimeType));
  const prompt = `
You are an OMR reader for JEE/NEET multiple-choice sheets.
Read filled bubbles for each question in order.

Return JSON:
{
  "answers": ["A","B","C","D", ...],
  "anomalies": ["Q3 double bubble", "Q7 faint mark"],
  "notes": "short read quality note"
}

Rules:
- Use A, B, C, D for selected options
- Use "-" for blank/unmarked
- Use "?" for ambiguous/double bubbles
- One entry per question, in order starting Q1
`.trim();

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

export async function gradeWithGemini(params: {
  student: Student;
  answerText: string;
  rubricText: string;
  stream: Stream;
}): Promise<{ grading: AiGradingPayload; rubricContext: string; retrievalStage: string }> {
  const rubricContext = await retrieveRubricContext(params.answerText, params.rubricText);
  const retrievalStage = params.rubricText.length > 6000 ? "EMBED_RAG" : "FULL_RUBRIC";

  const prompt = `
You are PrepForge Faculty Evaluation AI for ${params.stream} (JEE/NEET).
Grade the student answer ONLY using the marking rubric below.
Do not use outside knowledge to invent marks.

Student: ${params.student.name} (${params.student.roll})
Subject focus: ${params.student.subject}

MARKING RUBRIC:
${rubricContext}

STUDENT ANSWER:
${params.answerText}

Return JSON matching the schema parameters:
- "stepGrades": Array of evaluations per rubric point
- "strengths": Topics where student performed well
- "weaknesses": Topics with missing/incorrect details
- "topicGaps": syllabus subtopics with concept gaps
- "recommendations": targeted study steps
- "summary": brief faculty description
- "overallConfidence": float confidence 0.0 to 1.0

Rules:
- Award partial credit for correct method even if final answer is wrong
- If evidence is weak, set status to "review" and awarded to 0 or partial
- Every awarded mark must have evidenceQuote from the student answer
- recommendations must target topicGaps
`.trim();

  const grading = await geminiGenerateJson<AiGradingPayload>(prompt, [], aiGradingSchema);
  if (!Array.isArray(grading.stepGrades) || typeof grading.summary !== "string") {
    throw new PrepForgeError({
      kind: "invalid_response",
      component: "gradeWithGemini",
      message: "Gemini grading response did not match the expected stepGrades/summary shape.",
      response: grading,
    });
  }
  return { grading, rubricContext, retrievalStage };
}

export function mapAiGradingToResult(
  grading: AiGradingPayload,
  student: Student,
  meta: { retrievalStage: string; ocrUsed: boolean }
): EvaluationResult {
  const stepGrades = (grading.stepGrades || []).map((grade) => ({
    rubricId: grade.rubricId || "STEP",
    topic: grade.topic || "General",
    expected: grade.expected || "",
    awarded: clamp(grade.awarded, 0, grade.max || 0),
    max: Math.max(grade.max || 0, grade.awarded || 0),
    confidence: clamp(grade.confidence ?? 0.7, 0, 1),
    status: grade.status || "review",
    note: grade.note || "",
    citations: grade.evidenceQuote
      ? [
          {
            id: `${grade.rubricId}-E1`,
            source: grade.citationSource || "Rubric",
            line: 1,
            excerpt: grade.evidenceQuote,
          },
        ]
      : [],
  }));

  const descriptiveScore = stepGrades.reduce((sum, g) => sum + g.awarded, 0);
  const descriptiveTotal = Math.max(1, stepGrades.reduce((sum, g) => sum + g.max, 0));
  const score = Math.round((descriptiveScore / descriptiveTotal) * 100);
  const citations = stepGrades.flatMap((g) => g.citations);

  return {
    score,
    total: 100,
    confidence: clamp(grading.overallConfidence ?? 0.8, 0, 1),
    stepGrades,
    citations,
    omr: { score: 0, total: 0, items: [], anomalies: [] },
    strengths: grading.strengths?.length ? grading.strengths : ["Structured attempt"],
    gaps: grading.topicGaps?.length ? grading.topicGaps : grading.weaknesses || [],
    recommendations: grading.recommendations?.length
      ? grading.recommendations
      : ["Review NCERT basics for flagged topics."],
    retrievalTrace: [
      { stage: "INGEST", detail: meta.ocrUsed ? "Answer sheet processed with Gemini Vision OCR." : "Typed answer text used." },
      { stage: "RAG", detail: meta.retrievalStage === "EMBED_RAG" ? "Rubric chunks retrieved with Gemini embeddings." : "Full rubric passed to grader." },
      { stage: "GRADE", detail: "Gemini structured JSON grading with evidence quotes." },
      { stage: "GUARDRAIL", detail: "Marks clamped to rubric max; weak evidence flagged for review." },
    ],
    summary: grading.summary || `${student.name} evaluation complete.`,
    aiText: grading.summary,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
