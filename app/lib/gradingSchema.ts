import { z } from "zod";

/**
 * Criterion breakdown within a rubric
 */
export const RubricCriterionSchema = z.object({
  criterion: z.string().describe("Name of the criterion, e.g. Formula, Substitution, Calculation, Units"),
  awarded: z.number().min(0).describe("Marks awarded for this criterion"),
  max: z.number().min(0).describe("Maximum possible marks for this criterion"),
  met: z.boolean().describe("Whether this criterion was satisfied"),
});

export type RubricCriterion = z.infer<typeof RubricCriterionSchema>;

/**
 * Specific error details when marks are deducted
 */
export const GradingErrorSchema = z.object({
  step: z.string().describe("Specific step where the error occurred"),
  student_wrote: z.string().describe("What the student wrote in their answer"),
  expected: z.string().describe("What was expected at this step"),
});

export type GradingError = z.infer<typeof GradingErrorSchema>;

/**
 * Grounded citation quote
 */
export const GroundedCitationSchema = z.object({
  id: z.string().optional(),
  source: z.string().optional().default("Student Answer"),
  line: z.number().optional().default(1),
  excerpt: z.string().describe("Exact quote from the student's answer text"),
});

export type GroundedCitation = z.infer<typeof GroundedCitationSchema>;

/**
 * Single Question Grading output schema
 */
export const QuestionGradingSchema = z.object({
  question_no: z.string().describe("e.g. Q20, Q21"),
  section: z.string().default("Section B").describe("e.g. Section A, Section B"),
  topic: z.string().describe("Topic or question title, e.g. Modern Physics (Photons)"),
  marks_awarded: z.number().min(0),
  marks_max: z.number().min(0),
  rubric_breakdown: z.array(RubricCriterionSchema).default([]),
  errors: z.array(GradingErrorSchema).default([]),
  feedback: z.string().describe("Max 2 sentences feedback"),
  student_final_answer: z.string().default("").describe("Student final answer in plain text/Unicode"),
  expected_final_answer: z.string().default("").describe("Expected final answer in plain text/Unicode"),
  confidence: z.number().min(0).max(1).default(0.9),
  needs_review: z.boolean().default(false),
  reasoning: z.string().default("").describe("Chain of thought reasoning"),
  citations: z.array(GroundedCitationSchema).default([]),
  teacher_override: z
    .object({
      original_marks: z.number(),
      new_marks: z.number(),
      reason: z.string().optional(),
      overridden_at: z.string(),
      teacher_name: z.string().optional(),
    })
    .optional(),
});

export type QuestionGrading = z.infer<typeof QuestionGradingSchema>;

/**
 * Top-level AI grading response schema
 */
export const GradingResponseSchema = z.object({
  questions: z.array(QuestionGradingSchema),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  topicGaps: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  summary: z.string().default(""),
  overallConfidence: z.number().min(0).max(1).default(0.85),
});

export type GradingResponse = z.infer<typeof GradingResponseSchema>;

/**
 * Validate and safely parse a grading response payload.
 * Returns { success: true, data } or { success: false, error: string }
 */
export function validateGradingResponse(input: unknown): {
  success: boolean;
  data?: GradingResponse;
  error?: string;
  zodIssues?: z.ZodIssue[];
} {
  const result = GradingResponseSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.issues.map((i) => `[${i.path.join(".")}] ${i.message}`).join("; "),
    zodIssues: result.error.issues,
  };
}

/**
 * Convert legacy AiGradingPayload or raw JSON into a standardized GradingResponse
 */
export function normalizeRawGrading(raw: unknown): GradingResponse {
  if (!raw || typeof raw !== "object") {
    return {
      questions: [],
      strengths: [],
      weaknesses: [],
      topicGaps: [],
      recommendations: [],
      summary: "Empty grading response received.",
      overallConfidence: 0.5,
    };
  }

  const rawObj = raw as Record<string, unknown>;

  // If already structured with questions
  if (Array.isArray(rawObj.questions)) {
    const questions: QuestionGrading[] = rawObj.questions.map((item: unknown, idx: number) => {
      const q = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      const qNo = q.question_no ? String(q.question_no).trim() : `Q${idx + 1}`;
      const marksMax = Number(q.marks_max ?? q.max ?? 2);
      const marksAwarded = Number(q.marks_awarded ?? q.awarded ?? 0);
      const rubricBreakdown = Array.isArray(q.rubric_breakdown)
        ? q.rubric_breakdown.map((rItem: unknown) => {
            const r = (rItem && typeof rItem === "object" ? rItem : {}) as Record<string, unknown>;
            const aw = Number(r.awarded ?? 0);
            const mx = Number(r.max ?? 1);
            return {
              criterion: String(r.criterion || "Step"),
              awarded: aw,
              max: mx,
              met: Boolean(r.met ?? (aw >= mx)),
            };
          })
        : [];

      const errors = Array.isArray(q.errors)
        ? q.errors.map((eItem: unknown) => {
            const e = (eItem && typeof eItem === "object" ? eItem : {}) as Record<string, unknown>;
            return {
              step: String(e.step || ""),
              student_wrote: String(e.student_wrote || ""),
              expected: String(e.expected || ""),
            };
          })
        : [];

      return {
        question_no: qNo,
        section: String(q.section || "Section B"),
        topic: String(q.topic || `Question ${idx + 1}`),
        marks_awarded: Math.min(marksMax, Math.max(0, marksAwarded)),
        marks_max: marksMax,
        rubric_breakdown: rubricBreakdown,
        errors: errors,
        feedback: String(q.feedback || q.note || ""),
        student_final_answer: String(q.student_final_answer || ""),
        expected_final_answer: String(q.expected_final_answer || q.expected || ""),
        confidence: typeof q.confidence === "number" ? Math.max(0, Math.min(1, q.confidence)) : 0.85,
        needs_review: Boolean(q.needs_review || (q.confidence !== undefined && (q.confidence as number) < 0.7)),
        reasoning: String(q.reasoning || ""),
        citations: Array.isArray(q.citations)
          ? q.citations.map((cItem: unknown) => {
              const c = (cItem && typeof cItem === "object" ? cItem : {}) as Record<string, unknown>;
              return {
                id: c.id ? String(c.id) : undefined,
                source: String(c.source || "Student Answer"),
                line: Number(c.line || 1),
                excerpt: String(c.excerpt || ""),
              };
            })
          : q.evidenceQuote
          ? [
              {
                id: `${qNo}-E1`,
                source: String(q.citationSource || "Student Answer"),
                line: 1,
                excerpt: String(q.evidenceQuote),
              },
            ]
          : [],
        teacher_override: q.teacher_override as QuestionGrading["teacher_override"],
      };
    });

    return {
      questions,
      strengths: Array.isArray(rawObj.strengths) ? (rawObj.strengths as string[]) : [],
      weaknesses: Array.isArray(rawObj.weaknesses) ? (rawObj.weaknesses as string[]) : [],
      topicGaps: Array.isArray(rawObj.topicGaps) ? (rawObj.topicGaps as string[]) : [],
      recommendations: Array.isArray(rawObj.recommendations) ? (rawObj.recommendations as string[]) : [],
      summary: String(rawObj.summary || ""),
      overallConfidence: typeof rawObj.overallConfidence === "number" ? rawObj.overallConfidence : 0.85,
    };
  }

  // If legacy stepGrades array
  if (Array.isArray(rawObj.stepGrades)) {
    const questions: QuestionGrading[] = rawObj.stepGrades.map((stepItem: unknown, idx: number) => {
      const step = (stepItem && typeof stepItem === "object" ? stepItem : {}) as Record<string, unknown>;
      const rubricIdStr = String(step.rubricId || "");
      const qNo = rubricIdStr.startsWith("Q")
        ? rubricIdStr
        : /^\d+/.test(rubricIdStr)
        ? `Q${rubricIdStr}`
        : `Q${idx + 1}`;
      const max = Number(step.max ?? 2);
      const awarded = Number(step.awarded ?? 0);

      return {
        question_no: qNo,
        section: String(step.section || "Section B"),
        topic: String(step.topic || "Descriptive Problem"),
        marks_awarded: Math.min(max, Math.max(0, awarded)),
        marks_max: max,
        rubric_breakdown: [
          {
            criterion: "Formula & Concepts",
            awarded: Math.min(max / 2, awarded),
            max: max / 2,
            met: awarded >= max / 2,
          },
          {
            criterion: "Calculation & Units",
            awarded: Math.max(0, awarded - max / 2),
            max: max / 2,
            met: awarded >= max,
          },
        ],
        errors:
          awarded < max
            ? [
                {
                  step: "Execution",
                  student_wrote: String(step.evidenceQuote || "Calculation step"),
                  expected: String(step.expected || "Correct numerical substitution and final unit"),
                },
              ]
            : [],
        feedback: String(step.note || ""),
        student_final_answer: "",
        expected_final_answer: String(step.expected || ""),
        confidence: typeof step.confidence === "number" ? step.confidence : 0.85,
        needs_review: step.status === "review" || ((step.confidence as number) ?? 1) < 0.7,
        reasoning: String(step.reasoning || ""),
        citations: step.evidenceQuote
          ? [
              {
                id: `${qNo}-E1`,
                source: String(step.citationSource || "Student Answer"),
                line: 1,
                excerpt: String(step.evidenceQuote),
              },
            ]
          : [],
      };
    });

    return {
      questions,
      strengths: Array.isArray(rawObj.strengths) ? (rawObj.strengths as string[]) : [],
      weaknesses: Array.isArray(rawObj.weaknesses) ? (rawObj.weaknesses as string[]) : [],
      topicGaps: Array.isArray(rawObj.topicGaps) ? (rawObj.topicGaps as string[]) : [],
      recommendations: Array.isArray(rawObj.recommendations) ? (rawObj.recommendations as string[]) : [],
      summary: String(rawObj.summary || ""),
      overallConfidence: typeof rawObj.overallConfidence === "number" ? rawObj.overallConfidence : 0.85,
    };
  }

  return {
    questions: [],
    strengths: [],
    weaknesses: [],
    topicGaps: [],
    recommendations: [],
    summary: String(rawObj.summary || ""),
    overallConfidence: 0.5,
  };
}
