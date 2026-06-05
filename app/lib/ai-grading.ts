import { geminiEmbed, geminiGenerateJson, geminiGenerateText, imagePart } from "@/lib/gemini";
import type { EvaluationResult, Student, Stream } from "@/lib/evaluation";

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

function chunkRubric(text: string, size = 500): string[] {
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

function cosineSimilarity(a: number[], b: number[]) {
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

async function retrieveRubricContext(answerText: string, rubricText: string): Promise<string> {
  const chunks = chunkRubric(rubricText);
  if (!chunks.length) return rubricText;
  if (rubricText.length <= 6000) return rubricText;

  try {
    const answerEmbed = await geminiEmbed(answerText.slice(0, 2000));
    const scored = await Promise.all(
      chunks.map(async (chunk) => {
        const chunkEmbed = await geminiEmbed(chunk);
        return { chunk, score: cosineSimilarity(answerEmbed, chunkEmbed) };
      })
    );
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((item) => item.chunk)
      .join("\n\n---\n\n");
  } catch {
    return chunks.slice(0, 6).join("\n\n---\n\n");
  }
}

export async function ocrAnswerSheets(images: ImageInput[]): Promise<string> {
  if (!images.length) return "";

  const parts = images.map((img) => imagePart(img.base64, img.mimeType));
  const prompt = `
You are an OCR engine for JEE/NEET handwritten and printed answer sheets.
Transcribe ALL student work faithfully:
- Preserve line breaks between steps
- Include formulas, units, diagrams described in text, and numbered lines
- Mark unclear words as [unclear]
- Do not grade or comment — only transcribe

Return plain text only, no JSON.
`.trim();

  return geminiGenerateText(prompt, parts);
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

  return geminiGenerateJson<OmrVisionPayload>(prompt, parts);
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

Return JSON:
{
  "stepGrades": [
    {
      "rubricId": "string id",
      "topic": "topic name",
      "expected": "what rubric requires",
      "awarded": number,
      "max": number,
      "confidence": 0.0-1.0,
      "status": "earned" | "partial" | "review",
      "note": "why marks were awarded or deducted",
      "evidenceQuote": "exact quote from student answer",
      "citationSource": "rubric reference"
    }
  ],
  "strengths": ["string"],
  "weaknesses": ["string"],
  "topicGaps": ["string"],
  "recommendations": ["NCERT-focused practice suggestions"],
  "summary": "2-3 sentence faculty summary",
  "overallConfidence": 0.0-1.0
}

Rules:
- Award partial credit for correct method even if final answer is wrong
- If evidence is weak, set status to "review" and awarded to 0 or partial
- Every awarded mark must have evidenceQuote from the student answer
- recommendations must target topicGaps
`.trim();

  const grading = await geminiGenerateJson<AiGradingPayload>(prompt);
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
