import { geminiGenerateJson, imagePart, hasGeminiKey, geminiGenerateText, geminiEmbed } from "@/lib/gemini";
import { mistralOCR, hasMistralKey } from "@/lib/mistralOCR";
import { getTopRubricChunks, hasHfToken } from "@/lib/hfEmbeddings";
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
  reasoning?: string;
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
          reasoning: { type: SchemaType.STRING, description: "Chain-of-thought analysis comparing the student's answer to this specific rubric point, checking formulas, sign convention, calculations, and completeness." },
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
          "reasoning",
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

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

async function getTopRubricChunksWithGemini(
  studentAnswer: string,
  rubric: string,
  topK = 6
): Promise<string[]> {
  const chunks = chunkRubric(rubric, 400);
  if (!chunks.length) return [rubric];
  if (rubric.length <= 4000) return chunks.slice(0, topK);

  try {
    const studentEmbed = await geminiEmbed(studentAnswer.slice(0, 1500));
    const targetChunks = chunks.slice(0, 25);
    const chunkEmbeds = await Promise.all(targetChunks.map(c => geminiEmbed(c)));

    return targetChunks
      .map((chunk, i) => ({
        chunk,
        score: cosineSimilarity(studentEmbed, chunkEmbeds[i]),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((x) => x.chunk);
  } catch (error) {
    console.warn("Gemini embedding retrieval failed, falling back to sequential slicing:", error);
    return chunks.slice(0, topK);
  }
}

async function retrieveRubricContext(answerText: string, rubricText: string): Promise<string> {
  const chunks = chunkRubric(rubricText);
  if (!chunks.length) return rubricText;
  if (rubricText.length <= 6000) return rubricText;

  if (hasGeminiKey()) {
    try {
      const topChunks = await getTopRubricChunksWithGemini(answerText, rubricText, 6);
      return topChunks.join("\n\n---\n\n");
    } catch (error) {
      logDebugError(normalizeError(error, { kind: "gemini_error", component: "retrieveRubricContext.geminiEmbed" }));
    }
  }

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

export async function ocrAnswerSheets(images: ImageInput[]): Promise<string> {
  if (!images.length) return "";

  if (hasMistralKey()) {
    const results = await Promise.all(
      images.map((img) => mistralOCR(img.base64, img.mimeType))
    );
    return results.filter(Boolean).join("\n\n");
  }

  if (hasGeminiKey()) {
    const results = await Promise.all(
      images.map(async (img) => {
        const prompt = `
You are an expert OCR engine specializing in academic answer sheets.
Perform high-fidelity OCR on this document page.
- Retain all math formulas, symbols (e.g. derivatives, integrals, matrices), chemical reactions, and structures.
- Transcribe handwriting with maximum precision.
- Do not summarize or correct the student's text.
- If there are drawings or graphs, include a brief description in brackets e.g. [Diagram: Ray diagram showing refraction through a convex lens].
`.trim();
        return await geminiGenerateText(prompt, [imagePart(img.base64, img.mimeType)]);
      })
    );
    return results.filter(Boolean).join("\n\n");
  }

  throw new PrepForgeError({
    kind: "gemini_error",
    component: "ocrAnswerSheets",
    message: "No OCR provider available. Set GEMINI_API_KEY or MISTRAL_API_KEY in .env.",
    statusCode: 503,
  });
}

export async function ocrOmrSheet(images: ImageInput[]): Promise<OmrVisionPayload> {
  if (!images.length) {
    return { answers: [], anomalies: [], notes: "No OMR image provided." };
  }

  const parts = images.map((img) => imagePart(img.base64, img.mimeType));
  const prompt = `
You are an expert high-fidelity OMR Sheet scanner for JEE/NEET competitive exams.
Analyze the uploaded OMR sheet image and extract the selected options for each question.

GRID & BUBBLE IDENTIFICATION RULES:
1. Locate the OMR response grids. Questions are normally numbered sequentially (e.g. Q1 to Q10 or Q1 to Q90).
2. For each question number, inspect the options (typically bubbles labeled A, B, C, D).
3. Determine which bubble is filled/darkened:
   - If a bubble is clearly filled, record that option ("A", "B", "C", or "D").
   - If no bubble is filled for a question, record "-".
   - If multiple bubbles are filled or there is an unclear smudge/double-bubble, record "?" and flag it as an anomaly.
   - If a bubble is very faintly marked, record the option but flag it in "anomalies" (e.g., "Q5 faint mark, needs review").
4. Read all questions starting from Q1 in order. Do not skip any question row.

Return JSON matching the schema:
{
  "answers": ["A", "B", "-", "C", ...],
  "anomalies": ["Q4 double-filled", "Q9 faint mark"],
  "notes": "Short description of sheet readability, alignment, and scanner confidence."
}
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
You are PrepForge Faculty Evaluation AI, an expert grader for ${params.stream} (JEE/NEET).
Analyze the student's answer and grade it strictly based on the provided MARKING RUBRIC.

STUDENT INFO:
Name: ${params.student.name}
Roll: ${params.student.roll}
Subject focus: ${params.student.subject}

MARKING RUBRIC:
${rubricContext}

STUDENT ANSWER:
${params.answerText}

INSTRUCTIONS FOR EVALUATION:
1. Compare the student's response to each point in the rubric one by one.
2. For each rubric point, perform Chain-of-Thought (CoT) reasoning in the "reasoning" field:
   - Identify if the student wrote down the correct formulas and definitions.
   - Check if they applied proper sign conventions (especially in Physics/Chemistry).
   - Check the numerical calculations step-by-step.
   - Verify if the final numerical answer is correct and includes correct units.
3. Award marks based on evidence:
   - Full marks ("earned") only if the step is complete and correct.
   - Partial marks ("partial") if the method is correct but has a small calculation mistake or missing units.
   - Zero/Low marks with "review" status if the explanation is missing, incorrect, or cannot be verified.
4. Provide an exact quote ("evidenceQuote") from the student's answer that proves they attempted this step. If they didn't attempt it, leave it empty.
5. In "topicGaps", list the specific concept gaps identified (e.g. "Missed lens formula sign convention", "Direct effect explanation missing").
6. Provide concrete, actionable recommendations matching these gaps.

Return JSON according to the schema.
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
    reasoning: grade.reasoning || "",
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
      { stage: "GRADE", detail: "Gemini structured JSON grading with CoT reasoning and evidence quotes." },
      { stage: "GUARDRAIL", detail: "Marks clamped to rubric max; weak evidence flagged for review." },
    ],
    summary: grading.summary || `${student.name} evaluation complete.`,
    aiText: grading.summary,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
