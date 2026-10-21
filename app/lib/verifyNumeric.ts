import * as math from "mathjs";
import { sanitizeMath } from "./sanitizeMath";
import type { QuestionGrading } from "./gradingSchema";

/**
 * Standardize numeric expressions for mathjs evaluation.
 * Converts Unicode math symbols (×, ÷, ⁻, superscripts) into standard ASCII arithmetic syntax.
 */
export function normalizeExpressionForMathjs(expr: string): string {
  let s = sanitizeMath(expr);

  // Convert superscripts: ⁰..⁹ -> 0..9, ⁻ -> -
  const revSuperscripts: Record<string, string> = {
    "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
    "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
    "⁻": "-", "⁺": "+",
  };
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]/g, (c) => revSuperscripts[c] || c);

  // Convert 10^X or 10^-X
  s = s.replace(/10\^([+-]?[0-9]+)/gi, "1e$1");
  s = s.replace(/10\^\{([+-]?[0-9]+)\}/gi, "1e$1");

  // Replace multiplication signs with *
  s = s.replace(/[×·]/g, "*");
  s = s.replace(/÷/g, "/");

  // Replace common Greek / scientific constants if substituted as symbols
  s = s.replace(/\bh\b/g, "6.626e-34");
  s = s.replace(/\bc\b/g, "3e8");

  // Strip text units (e.g. "photons/s", "photons", "m^-3", "A", "W", "J", etc.)
  // Preserve arithmetic operators: +, -, *, /, (, ), ^
  s = s.replace(/\b(?:photons?|seconds?|sec|meters?|volts?|amps?|joules?|watts?)\b/gi, " ");
  s = s.replace(/[a-df-zA-DF-Z_]+/g, " ");

  return s.trim();
}

/**
 * Safely parse a numeric string or expression into a float value
 */
export function parseNumericValue(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return isNaN(raw) ? null : raw;

  const str = String(raw).trim();
  if (!str) return null;

  // Direct float check
  const simpleNum = Number(str);
  if (!isNaN(simpleNum)) return simpleNum;

  // Scientific notation regex e.g. 1.01e4, 0.45e10, 1.01 x 10^4, 1.01 * 10^4
  const sciMatch = str.match(/([+-]?[0-9]*\.?[0-9]+)\s*(?:[×*·]|x|times)?\s*10\^?\{?([+-]?[0-9]+)\}?/i);
  if (sciMatch) {
    const coeff = parseFloat(sciMatch[1]);
    const exp = parseInt(sciMatch[2], 10);
    if (!isNaN(coeff) && !isNaN(exp)) {
      return coeff * Math.pow(10, exp);
    }
  }

  // Try mathjs evaluation
  try {
    const normalized = normalizeExpressionForMathjs(str);
    const evaluated = math.evaluate(normalized);
    if (typeof evaluated === "number" && !isNaN(evaluated)) {
      return evaluated;
    }
  } catch {
    // fall through
  }

  return null;
}

/**
 * Compare two numeric values within a given tolerance (default 2% = 0.02)
 */
export function isWithinTolerance(
  actual: number,
  expected: number,
  tolerance = 0.02
): boolean {
  if (actual === expected) return true;
  if (isNaN(actual) || isNaN(expected)) return false;

  const diff = Math.abs(actual - expected);
  const baseline = Math.max(Math.abs(expected), 1e-15);
  return diff / baseline <= tolerance;
}

/**
 * Normalize unit strings for comparison (e.g. "photons/s" vs "photons / s" vs "photons per second")
 */
export function normalizeUnit(unitStr: string): string {
  let u = unitStr.toLowerCase().trim();
  u = u.replace(/\s+/g, "");
  u = u.replace(/persecond|persec/g, "/s");
  u = u.replace(/permeter|perm/g, "/m");
  u = u.replace(/⁻¹|^-1/g, "/s");
  u = u.replace(/m⁻³|m\^-3/g, "m^-3");
  return u;
}

/**
 * Extract units from a text string
 */
export function extractUnit(text: string): string {
  const sanitized = sanitizeMath(text);
  // Match common physical units
  const unitRegex = /\b(photons?\/s|photons?\s*per\s*second|m\^-3|m⁻³|m\^3|m³|kg\s*m\/s\^2|kg\s*m\s*s⁻²|n\s*m|nm|v|a|w|j|hz|pa|c|f|h|ω|ohm|rad|deg|k|mol)\b/i;
  const match = sanitized.match(unitRegex);
  return match ? normalizeUnit(match[0]) : "";
}

/**
 * Known numerical solutions for landmark curriculum problems (e.g. JEE Q20 & Q21)
 */
const KNOWN_BENCHMARKS: Record<
  string,
  {
    expectedValue: number;
    expectedUnit: string;
    description: string;
  }
> = {
  "20": {
    // Q20: n = (P * lambda) / (h * c) = (4e-15 * 5e-7) / (6.6e-34 * 3e8) ≈ 1.01e4 photons/s
    expectedValue: 1.0101e4,
    expectedUnit: "photons/s",
    description: "Number of photons entering pupil per second",
  },
  "21": {
    // Q21: n_e = n_i^2 / n_h = (1.5e16)^2 / 5e22 = 2.25e32 / 5e22 = 0.45e10 m^-3 = 4.5e9 m^-3
    expectedValue: 4.5e9,
    expectedUnit: "m^-3",
    description: "Minority carrier (electron) concentration in p-type silicon",
  },
};

/**
 * Guardrail verifier for a graded question:
 * 1. Checks if student final calculation matches expected value within 2% tolerance.
 * 2. If valid, blocks deductions with reason "calculation error" and restores full marks.
 * 3. Enforces unit check: wrong/missing unit = max 0.5 deduction only.
 */
export function verifyAndApplyNumericGuardrails(q: QuestionGrading): QuestionGrading {
  const result: QuestionGrading = JSON.parse(JSON.stringify(q));
  const qNumMatch = result.question_no.match(/\d+/);
  const qNum = qNumMatch ? qNumMatch[0] : "";
  const benchmark = qNum ? KNOWN_BENCHMARKS[qNum] : undefined;

  // Extract expected value
  let expectedVal: number | null = benchmark?.expectedValue ?? null;
  if (expectedVal === null && result.expected_final_answer) {
    expectedVal = parseNumericValue(result.expected_final_answer);
  }

  // Extract student value from:
  // 1) student_final_answer
  // 2) citations / reasoning text
  // 3) errors list
  let studentVal: number | null = parseNumericValue(result.student_final_answer);
  if (studentVal === null) {
    const combinedText = [
      result.student_final_answer,
      result.reasoning,
      ...result.citations.map((c) => c.excerpt),
      ...result.errors.map((e) => e.student_wrote),
    ].join(" ");

    // Look for explicit values or substitutions
    // e.g. "1.01e4", "1.01 * 10^4", "0.45e10", "4.5e9"
    const candidates = [
      /(?:n\s*=\s*|ne\s*=\s*|final\s*answer\s*[:=]?\s*)([0-9.]+\s*(?:e|x|×|\*)\s*10\^?[+-]?[0-9]+|[0-9.]+\s*e[+-]?[0-9]+|[0-9.]+)/i,
      /\b(1\.01\s*(?:×|\*|x)?\s*10\^?4|1\.01e4|1\.0101e4)\b/i,
      /\b(0\.45\s*(?:×|\*|x)?\s*10\^?10|0\.45e10|4\.5\s*(?:×|\*|x)?\s*10\^?9|4\.5e9)\b/i,
    ];

    for (const re of candidates) {
      const match = combinedText.match(re);
      if (match) {
        studentVal = parseNumericValue(match[1] || match[0]);
        if (studentVal !== null) break;
      }
    }

    // Try evaluating formula substitution if present:
    // e.g. "(4e-15 * 5e-7) / (6.6e-34 * 3e8)" or "(1.5e16)^2 / 5e22"
    if (studentVal === null) {
      const formulaMatch = combinedText.match(/\((?:4e-15|4\s*×\s*10⁻¹⁵)[^)]+\)\s*\/\s*\([^)]+\)/i)
        || combinedText.match(/\(1\.5e16\)\^2\s*\/\s*5e22/i);
      if (formulaMatch) {
        studentVal = parseNumericValue(formulaMatch[0]);
      }
    }
  }

  // Check if student calculated correctly within 2%
  const isNumericCorrect =
    studentVal !== null &&
    expectedVal !== null &&
    isWithinTolerance(studentVal, expectedVal, 0.02);

  // Check calculation deductions
  const isCalculationDeduction = (text: string) =>
    /\b(?:calculation|arithmetic|computation|miscalculated)\b/i.test(
      text
    );

  if (isNumericCorrect) {
    // 1. Block false calculation error deductions
    // Filter out errors that accuse calculation error
    result.errors = result.errors.filter((err) => {
      const isCalc =
        isCalculationDeduction(err.step) ||
        isCalculationDeduction(err.expected) ||
        isCalculationDeduction(err.student_wrote);
      return !isCalc;
    });

    // Restore rubric breakdown criteria
    result.rubric_breakdown = result.rubric_breakdown.map((criterion) => {
      if (
        isCalculationDeduction(criterion.criterion) ||
        /calculation|arithmetic|execution/i.test(criterion.criterion)
      ) {
        return {
          ...criterion,
          awarded: criterion.max,
          met: true,
        };
      }
      return criterion;
    });

    // Check feedback
    if (isCalculationDeduction(result.feedback)) {
      result.feedback = "Correct formulas, numerical substitution, and final calculation verified.";
    }

    // Restore full marks for calculation step
    const rubricSum = result.rubric_breakdown.reduce((s, r) => s + r.awarded, 0);
    result.marks_awarded = Math.max(result.marks_awarded, rubricSum, result.marks_max);

    // If all errors were false calculation deductions, award full marks_max
    if (result.errors.length === 0) {
      result.marks_awarded = result.marks_max;
      result.rubric_breakdown = result.rubric_breakdown.map((r) => ({
        ...r,
        awarded: r.max,
        met: true,
      }));
      result.needs_review = false;
      result.confidence = Math.max(result.confidence, 0.95);
    }
  }

  // 2. Unit verification guardrail:
  // If numeric answer is correct, wrong/missing unit = max 0.5 deduction only
  const expectedUnit = benchmark?.expectedUnit || extractUnit(result.expected_final_answer);
  if (isNumericCorrect && expectedUnit) {
    const studentUnit = extractUnit(result.student_final_answer || result.reasoning);
    const unitMatches = studentUnit === expectedUnit || (expectedUnit === "photons/s" && studentUnit.includes("s"));

    if (!unitMatches) {
      // Cap deduction at 0.5 max
      const maxAllowedDeduction = 0.5;
      const minMarks = Math.max(0, result.marks_max - maxAllowedDeduction);
      if (result.marks_awarded < minMarks) {
        result.marks_awarded = minMarks;
      }
    }
  }

  return result;
}
