import test, { describe, it } from "node:test";
import assert from "node:assert/strict";

import { sanitizeMath, sanitizeMathRecursive, toSuperscript } from "../app/lib/sanitizeMath";
import {
  parseNumericValue,
  isWithinTolerance,
  normalizeExpressionForMathjs,
  verifyAndApplyNumericGuardrails,
} from "../app/lib/verifyNumeric";
import {
  GradingResponseSchema,
  QuestionGradingSchema,
  validateGradingResponse,
  normalizeRawGrading,
  type QuestionGrading,
} from "../app/lib/gradingSchema";
import {
  checkDeductionValidity,
  isQuoteGrounded,
  applyGuardrailsToQuestion,
} from "../app/lib/gradingGuardrails";

describe("Step 2 — Plain-text Math & LaTeX Sanitizer", () => {
  it("repairs control character corruptions (\\times -> imes / \\t+imes)", () => {
    // Corrupted strings from JSON parsing control characters
    const withTab = "P = I\times A";
    assert.match(sanitizeMath("P = I imes A"), /P = I × A/);
    assert.match(sanitizeMath("4 imes 10^-15"), /4 × 10/);
    assert.match(sanitizeMath("\t imes "), /×/);
  });

  it("repairs ext{...} and \\text{...}", () => {
    assert.strictEqual(sanitizeMath("ext{wavelength}"), "wavelength");
    assert.strictEqual(sanitizeMath("\\text{wavelength}"), "wavelength");
    assert.strictEqual(sanitizeMath("\text{energy}"), "energy");
  });

  it("repairs rac{...}{...} and \\frac{...}{...}", () => {
    assert.strictEqual(sanitizeMath("rac{n hc}{lambda}"), "(n hc) / (λ)");
    assert.strictEqual(sanitizeMath("\\frac{n hc}{\\text{lambda}}"), "(n hc) / (λ)");
  });

  it("strips $ and $$ delimiters and converts symbols to Unicode", () => {
    const raw = "$P = I \\times A$ and $\\lambda = 5 \\times 10^{-7}$";
    const cleaned = sanitizeMath(raw);
    assert.strictEqual(cleaned.includes("$"), false);
    assert.match(cleaned, /P = I × A/);
    assert.match(cleaned, /λ = 5 × 10⁻⁷/);
  });

  it("converts unit exponents to superscripts", () => {
    assert.match(sanitizeMath("m^-3"), /m⁻³/);
    assert.match(sanitizeMath("s^-1"), /s⁻¹/);
    assert.strictEqual(toSuperscript("-15"), "⁻¹⁵");
  });

  it("recursively sanitizes nested objects and arrays", () => {
    const data = {
      formula: "$P = I imes A$",
      nested: {
        unit: "m^-3",
        items: ["ext{speed}", "rac{1}{2}"],
      },
    };
    const sanitized = sanitizeMathRecursive(data);
    assert.strictEqual(sanitized.formula, "P = I × A");
    assert.strictEqual(sanitized.nested.unit, "m⁻³");
    assert.strictEqual(sanitized.nested.items[0], "speed");
    assert.strictEqual(sanitized.nested.items[1], "(1) / (2)");
  });
});

describe("Step 1 — Zod Structured Output Schema", () => {
  it("validates a complete, compliant grading response", () => {
    const validPayload = {
      questions: [
        {
          question_no: "Q20",
          section: "Section B",
          topic: "Modern Physics (Photons)",
          marks_awarded: 2,
          marks_max: 2,
          rubric_breakdown: [
            { criterion: "Formula", awarded: 1, max: 1, met: true },
            { criterion: "Calculation", awarded: 1, max: 1, met: true },
          ],
          errors: [],
          feedback: "Accurate formulas and final numerical calculation.",
          student_final_answer: "1.01e4 photons/s",
          expected_final_answer: "1.01e4 photons/s",
          confidence: 0.95,
          needs_review: false,
          reasoning: "Steps match rubric requirements.",
        },
      ],
      strengths: ["Clear steps"],
      weaknesses: [],
      topicGaps: [],
      recommendations: ["Maintain practice"],
      summary: "Student performed well.",
      overallConfidence: 0.95,
    };

    const res = validateGradingResponse(validPayload);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data?.questions.length, 1);
  });

  it("fails validation gracefully when required question fields are missing", () => {
    const invalidPayload = {
      questions: [
        {
          // missing question_no and marks
          topic: "Missing required fields",
        },
      ],
    };
    const res = validateGradingResponse(invalidPayload);
    assert.strictEqual(res.success, false);
    assert.ok(res.error);
  });

  it("normalizes legacy stepGrades into structured questions format", () => {
    const legacy = {
      stepGrades: [
        {
          rubricId: "Q20",
          topic: "Photons",
          expected: "1.01e4",
          awarded: 1,
          max: 2,
          confidence: 0.8,
          status: "partial",
          note: "Partial credit awarded",
          evidenceQuote: "n = 1.01e4 photons/s",
        },
      ],
      summary: "Legacy summary",
      overallConfidence: 0.8,
    };
    const normalized = normalizeRawGrading(legacy);
    assert.strictEqual(normalized.questions.length, 1);
    assert.strictEqual(normalized.questions[0].question_no, "Q20");
    assert.strictEqual(normalized.questions[0].marks_awarded, 1);
  });
});

describe("Step 3 & 4 — Math Verifier & Guardrails", () => {
  it("evaluates math expressions with 2% tolerance check", () => {
    // 1.0101e4 vs 1.01e4
    assert.strictEqual(isWithinTolerance(10100, 10101, 0.02), true);
    assert.strictEqual(isWithinTolerance(10100, 10500, 0.02), false);

    // Q20 formula evaluation via mathjs
    const q20Formula = "(4e-15 * 5e-7) / (6.6e-34 * 3e8)";
    const val = parseNumericValue(q20Formula);
    assert.ok(val !== null);
    assert.ok(isWithinTolerance(val!, 1.0101e4, 0.02));
  });

  it("FIXTURE Q20: restores full marks (2/2) when calculation was falsely penalized", () => {
    // As described in Problem:
    // Q20 was given 1/2 with vague reason "calculation errors", but:
    // n = (4e-15 * 5e-7) / (6.6e-34 * 3e8) ≈ 1.01e4 photons/s is correct!
    const q20Initial: QuestionGrading = {
      question_no: "Q20",
      section: "Section B",
      topic: "Short Answer - Modern Physics (Photons)",
      marks_awarded: 1,
      marks_max: 2,
      rubric_breakdown: [
        { criterion: "Formula & Concepts", awarded: 1, max: 1, met: true },
        { criterion: "Calculation & Units", awarded: 0, max: 1, met: false },
      ],
      errors: [
        {
          step: "Calculation",
          student_wrote: "(4e-15 * 5e-7) / (6.6e-34 * 3e8) = 1.01e4 photons/s",
          expected: "1.01e4 photons/s",
        },
      ],
      feedback: "Correctly applied the concepts but made calculation errors.",
      student_final_answer: "1.01e4 photons/s",
      expected_final_answer: "1.01e4 photons/s",
      confidence: 0.9,
      needs_review: false,
      reasoning: "The student correctly calculates the power and energy per photon.",
      citations: [
        {
          id: "20-E1",
          source: "Section B, Q20",
          line: 1,
          excerpt: "(4e-15 * 5e-7) / (6.6e-34 * 3e8) = 1.01e4 photons/s",
        },
      ],
    };

    const verified = verifyAndApplyNumericGuardrails(q20Initial);

    // Must restore full marks: 2/2!
    assert.strictEqual(verified.marks_awarded, 2, "Q20 marks must be restored to full 2/2");
    assert.strictEqual(verified.errors.length, 0, "False calculation error must be removed");
    assert.strictEqual(verified.rubric_breakdown[1].met, true, "Calculation criterion must be met");
    assert.match(verified.feedback, /verified/i);
  });

  it("FIXTURE Q21: restores full marks (2/2) for semiconductor carrier concentration", () => {
    // Q21: n_e = n_i^2 / n_h = (1.5e16)^2 / 5e22 = 0.45e10 m^-3 (or 4.5e9 m^-3)
    const q21Initial: QuestionGrading = {
      question_no: "Q21",
      section: "Section B",
      topic: "Short Answer - Semiconductor Physics",
      marks_awarded: 1,
      marks_max: 2,
      rubric_breakdown: [
        { criterion: "Formula (ne * nh = ni^2)", awarded: 1, max: 1, met: true },
        { criterion: "Calculation (ne = 0.45e10 m^-3)", awarded: 0, max: 1, met: false },
      ],
      errors: [
        {
          step: "Calculation error",
          student_wrote: "ne = (1.5e16)^2 / 5e22 = 0.45e10 m^-3",
          expected: "ne = 4.5e9 m^-3",
        },
      ],
      feedback: "Correctly applied semiconductor physics principles but made calculation errors.",
      student_final_answer: "0.45e10 m^-3",
      expected_final_answer: "4.5e9 m^-3",
      confidence: 0.9,
      needs_review: false,
      reasoning: "Student used ne * nh = ni^2 and calculated 0.45e10 m^-3.",
      citations: [
        {
          id: "21-E1",
          source: "Section B, Q21",
          line: 1,
          excerpt: "ne = (1.5e16)^2 / 5e22 = 0.45e10 m^-3",
        },
      ],
    };

    const verified = verifyAndApplyNumericGuardrails(q21Initial);

    // 0.45e10 is mathematically identical to 4.5e9! Full marks must be restored
    assert.strictEqual(verified.marks_awarded, 2, "Q21 marks must be restored to full 2/2");
    assert.strictEqual(verified.errors.length, 0, "Calculation error must be blocked");
    assert.strictEqual(verified.rubric_breakdown[1].met, true);
  });

  it("FIXTURE Real Mistake: keeps deduction and lists the exact wrong step", () => {
    // A genuine calculation mistake: student computes 5.5e8 photons/s instead of 1.01e4
    const qMistake: QuestionGrading = {
      question_no: "Q20",
      section: "Section B",
      topic: "Short Answer - Modern Physics (Photons)",
      marks_awarded: 1,
      marks_max: 2,
      rubric_breakdown: [
        { criterion: "Formula Setup", awarded: 1, max: 1, met: true },
        { criterion: "Arithmetic Computation", awarded: 0, max: 1, met: false },
      ],
      errors: [
        {
          step: "Arithmetic evaluation of denominator (h * c)",
          student_wrote: "h * c = 3.6e-26, giving n = 5.5e8",
          expected: "h * c = 1.98e-25, giving n = 1.01e4 photons/s",
        },
      ],
      feedback: "Formula correctly stated but significant arithmetic mistake in denominator.",
      student_final_answer: "5.5e8 photons/s",
      expected_final_answer: "1.01e4 photons/s",
      confidence: 0.95,
      needs_review: false,
      reasoning: "Student made an arithmetic blunder in Planck constant multiplication.",
      citations: [],
    };

    const verified = verifyAndApplyNumericGuardrails(qMistake);

    // Mistake must KEEP the deduction
    assert.strictEqual(verified.marks_awarded, 1, "Real mistake must keep deduction");
    assert.strictEqual(verified.errors.length, 1, "Must retain the specific wrong step in errors");
    assert.strictEqual(verified.errors[0].step, "Arithmetic evaluation of denominator (h * c)");
    assert.strictEqual(verified.errors[0].student_wrote, "h * c = 3.6e-26, giving n = 5.5e8");
    assert.strictEqual(verified.rubric_breakdown[1].met, false);
  });

  it("checks quote grounding against transcript", () => {
    const transcript = "Used lens formula and sign convention for ray optics. Substituted focal length.";
    assert.strictEqual(isQuoteGrounded("lens formula and sign convention", transcript), true);
    assert.strictEqual(isQuoteGrounded("completely invented hallucinated text", transcript), false);
  });

  it("enforces deduction rule: rejects vague 'calculation errors' without concrete step", () => {
    const vagueQuestion: QuestionGrading = {
      question_no: "Q22",
      section: "Section B",
      topic: "Circuits",
      marks_awarded: 1,
      marks_max: 2,
      rubric_breakdown: [],
      errors: [
        {
          step: "calculation error",
          student_wrote: "",
          expected: "calculation errors",
        },
      ],
      feedback: "Calculation error",
      student_final_answer: "",
      expected_final_answer: "",
      confidence: 0.9,
      needs_review: false,
      reasoning: "",
      citations: [],
    };

    const check = checkDeductionValidity(vagueQuestion);
    assert.strictEqual(check.valid, false, "Vague deduction must be rejected");
    assert.strictEqual(check.needsRetry, true);
  });
});
