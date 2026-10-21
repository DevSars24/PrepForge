import type { QuestionGrading, GradingResponse } from "./gradingSchema";
import { sanitizeMath, sanitizeMathRecursive } from "./sanitizeMath";
import {
  verifyAndApplyNumericGuardrails,
  parseNumericValue,
  isWithinTolerance,
} from "./verifyNumeric";

/**
 * Normalize text for grounded quote matching:
 * Lowercases, strips punctuation, normalizes whitespace and Unicode math.
 */
export function normalizeForQuoteMatch(text: string): string {
  if (!text) return "";
  let s = sanitizeMath(text).toLowerCase();
  // Strip punctuation and special chars
  s = s.replace(/[^a-z0-9]/g, " ");
  s = s.replace(/\s+/g, " ");
  return s.trim();
}

/**
 * Filter out false error records where student wrote the expected answer
 */
export function isFalseDeductionError(studentWrote: string, expected: string): boolean {
  if (!studentWrote || !expected) return false;

  const normStudent = normalizeForQuoteMatch(studentWrote);
  const normExpected = normalizeForQuoteMatch(expected);

  // Exact normalized match (e.g. "i_1 = 2.5A" vs "i_1 = 2.5A")
  if (normStudent && normExpected && normStudent === normExpected) {
    return true;
  }

  // Pure numeric value check within 2%
  const sNum = parseNumericValue(studentWrote);
  const eNum = parseNumericValue(expected);
  if (sNum !== null && eNum !== null && isWithinTolerance(sNum, eNum, 0.02)) {
    return true;
  }

  // Substring match if one contains the other and numeric value is present
  if (normStudent && normExpected && (normStudent.includes(normExpected) || normExpected.includes(normStudent))) {
    if (sNum !== null && eNum !== null && isWithinTolerance(sNum, eNum, 0.02)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a student quote exists in the transcribed answer sheet
 */
export function isQuoteGrounded(quote: string, transcript: string): boolean {
  if (!quote || !transcript) return false;
  const normQuote = normalizeForQuoteMatch(quote);
  const normTranscript = normalizeForQuoteMatch(transcript);
  if (!normQuote) return true;
  // If the normalized quote is a substring of the transcript
  if (normTranscript.includes(normQuote)) return true;

  // Partial match: if 80% of words in quote appear in sequence
  const words = normQuote.split(" ").filter((w) => w.length > 2);
  if (words.length <= 2) {
    return normTranscript.includes(normQuote);
  }

  // Check 3-word n-grams
  for (let i = 0; i <= words.length - 3; i++) {
    const ngram = words.slice(i, i + 3).join(" ");
    if (normTranscript.includes(ngram)) {
      return true;
    }
  }

  return false;
}

/**
 * Deduction Rule Guardrail:
 * If marks_awarded < marks_max, errors[] must be non-empty with concrete
 * step, student_wrote, and expected.
 * Rejects vague text like "calculation errors" with no detail.
 */
export function checkDeductionValidity(q: QuestionGrading): {
  valid: boolean;
  needsRetry: boolean;
  reason?: string;
} {
  if (q.marks_awarded >= q.marks_max) {
    return { valid: true, needsRetry: false };
  }

  const realErrors = (q.errors || []).filter((err) => !isFalseDeductionError(err.student_wrote, err.expected));

  if (realErrors.length === 0) {
    // If student answers match expected, no retry needed
    const sNum = parseNumericValue(q.student_final_answer);
    const eNum = parseNumericValue(q.expected_final_answer);
    if (sNum !== null && eNum !== null && isWithinTolerance(sNum, eNum, 0.02)) {
      return { valid: true, needsRetry: false };
    }
    return {
      valid: false,
      needsRetry: true,
      reason: `Marks deducted for ${q.question_no} (${q.marks_awarded}/${q.marks_max}) but errors[] is empty or contains non-divergent steps. A concrete deviation is required.`,
    };
  }

  const isVague = (txt: string) => {
    const clean = txt.trim().toLowerCase();
    return (
      clean === "calculation errors" ||
      clean === "calculation error" ||
      clean === "error" ||
      clean === "mistake" ||
      clean === "wrong" ||
      clean.length < 5
    );
  };

  for (const err of realErrors) {
    if (isVague(err.step) || isVague(err.expected) || !err.student_wrote) {
      return {
        valid: false,
        needsRetry: true,
        reason: `Vague deduction reason in ${q.question_no}: "${err.step || err.expected}". Concrete step detail required.`,
      };
    }
  }

  return { valid: true, needsRetry: false };
}

/**
 * Apply all Guardrails to a single question:
 * 1. Sanitize math into plain text / Unicode
 * 2. Ground quotes against transcript
 * 3. Enforce marks consistency with rubric_breakdown
 * 4. Apply numeric mathjs verification (2% tolerance, block calculation deductions, unit checks)
 * 5. Set needs_review if confidence < 0.7 or unclear OCR
 */
export function applyGuardrailsToQuestion(
  rawQuestion: QuestionGrading,
  transcript: string,
  options?: { ocrUsed?: boolean; unclearOcr?: boolean }
): QuestionGrading {
  let q = sanitizeMathRecursive(rawQuestion);

  // Filter out any false deduction error records
  if (q.errors && q.errors.length > 0) {
    q.errors = q.errors.filter((err) => !isFalseDeductionError(err.student_wrote, err.expected));
  }

  // 1. Quote Grounding
  if (transcript && q.citations && q.citations.length > 0) {
    const groundedCitations = [];
    let ungroundedCount = 0;

    for (const citation of q.citations) {
      if (isQuoteGrounded(citation.excerpt, transcript)) {
        groundedCitations.push(citation);
      } else {
        ungroundedCount++;
      }
    }

    q.citations = groundedCitations;
    if (ungroundedCount > 0) {
      // Lower confidence if hallucinated quotes were dropped
      q.confidence = Math.max(0.1, Number((q.confidence - 0.15 * ungroundedCount).toFixed(2)));
    }
  }

  // 2. Marks consistency: recompute sum(rubric_breakdown.awarded) in code
  if (q.rubric_breakdown && q.rubric_breakdown.length > 0) {
    const calculatedAwarded = q.rubric_breakdown.reduce((sum, item) => sum + item.awarded, 0);
    const calculatedMax = q.rubric_breakdown.reduce((sum, item) => sum + item.max, 0);

    q.marks_awarded = Math.min(q.marks_max, calculatedAwarded);
    if (calculatedMax > 0 && q.marks_max <= 0) {
      q.marks_max = calculatedMax;
    }
  }

  // Contradiction flag: feedback says "mostly correct" but marks < 50%
  const feedbackLower = (q.feedback || "").toLowerCase();
  const isPraised =
    feedbackLower.includes("mostly correct") ||
    feedbackLower.includes("generally correct") ||
    feedbackLower.includes("well done") ||
    feedbackLower.includes("correct understanding");
  const marksPercentage = q.marks_max > 0 ? q.marks_awarded / q.marks_max : 1;

  if (isPraised && marksPercentage < 0.5) {
    q.needs_review = true;
  }

  // 3. Numeric verification guardrail (mathjs, 2% tolerance, restore false deductions)
  q = verifyAndApplyNumericGuardrails(q);

  // 4. Confidence and OCR ambiguity checks
  const transcriptHasIllegible = transcript.includes("[illegible]") || transcript.includes("[unclear]");
  if (q.confidence < 0.7 || options?.unclearOcr || transcriptHasIllegible) {
    q.needs_review = true;
  }

  return q;
}

/**
 * Apply guardrails to an entire grading response
 */
export function applyGuardrailsToGradingResponse(
  response: GradingResponse,
  transcript: string,
  options?: { ocrUsed?: boolean; unclearOcr?: boolean }
): GradingResponse {
  const sanitizedResponse = sanitizeMathRecursive(response);
  const guardrailedQuestions = sanitizedResponse.questions.map((q) =>
    applyGuardrailsToQuestion(q, transcript, options)
  );

  return {
    ...sanitizedResponse,
    questions: guardrailedQuestions,
  };
}
