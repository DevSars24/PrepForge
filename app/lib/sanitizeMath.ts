/**
 * Comprehensive plain-text / Unicode math sanitizer.
 * Repairs broken LaTeX control character corruptions (e.g. \times -> \t + imes, \frac -> \f + rac, \text -> \t + ext),
 * strips $ / $$ delimiters, and converts LaTeX expressions to clean, human-readable Unicode.
 */

const SUPERSCRIPT_MAP: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻",
  "+": "⁺",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  "n": "ⁿ",
  "i": "ⁱ",
};

/**
 * Convert a simple exponent string (e.g. "-15", "2", "4") to Unicode superscripts
 */
export function toSuperscript(exp: string): string {
  return exp
    .split("")
    .map((char) => SUPERSCRIPT_MAP[char] ?? char)
    .join("");
}

/**
 * Main string math sanitizer
 */
export function sanitizeMath(input: string | null | undefined): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  let text = input;

  // 1. Remove $ and $$ delimiters first
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, "$1");
  text = text.replace(/\$([^$]+)\$/g, "$1");

  // 2. Handle \text{...} BEFORE handling control chars or isolated "ext"
  // Handles \\text{...}, \text{...}, \t ext{...}, ext{...}
  text = text.replace(/\\+(?:text|mathrm|mathbf|mathit|textbf|textit)\{([^}]+)\}/g, "$1");
  text = text.replace(/[\t\x08]\s*ext\{([^}]+)\}/g, "$1");
  text = text.replace(/\bext\{([^}]+)\}/g, "$1");

  // 3. Handle \frac{...}{...} BEFORE isolated "rac"
  // Handles \\frac{...}{...}, \frac{...}{...}, \f rac{...}{...}, rac{...}{...}
  for (let i = 0; i < 3; i++) {
    text = text.replace(/\\+frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1) / ($2)");
    text = text.replace(/[\x0c]\s*rac\{([^{}]+)\}\{([^{}]+)\}/g, "($1) / ($2)");
    text = text.replace(/\brac\{([^{}]+)\}\{([^{}]+)\}/g, "($1) / ($2)");
  }

  // 4. Handle \times and corrupted variants BEFORE stripping backslashes
  // Handles \\times, \times, \t imes, orphaned "imes"
  text = text.replace(/\\+times\b/g, "×");
  text = text.replace(/[\t\x08]\s*imes\b/g, " × ");
  text = text.replace(/([0-9a-zA-Z_)\s])imes\b/g, "$1×");
  text = text.replace(/\bimes\b/g, "×");

  // Strip stray unprintable control characters (tab, backspace, formfeed, etc.)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  // 5. Convert other standard LaTeX operators to Unicode
  text = text.replace(/\\+cdot\b/g, "·");
  text = text.replace(/\\+div\b/g, "÷");
  text = text.replace(/\\+pm\b/g, "±");
  text = text.replace(/\\+approx\b/g, "≈");
  text = text.replace(/\\+ne\b|\\+neq\b/g, "≠");
  text = text.replace(/\\+le\b|\\+leq\b/g, "≤");
  text = text.replace(/\\+ge\b|\\+geq\b/g, "≥");
  text = text.replace(/\\+infty\b/g, "∞");
  text = text.replace(/\\+sqrt\{([^}]+)\}/g, "√($1)");
  text = text.replace(/\\+sqrt\b/g, "√");
  text = text.replace(/\\+circ\b/g, "°");

  // Greek letters commonly used in JEE/NEET physics & chemistry
  text = text.replace(/\b(?:\\+lambda|lambda)\b/gi, "λ");
  text = text.replace(/\\+Lambda\b/g, "Λ");
  text = text.replace(/\\+mu\b|\\+micro\b/g, "µ");
  text = text.replace(/\\+nu\b/g, "ν");
  text = text.replace(/\\+pi\b/g, "π");
  text = text.replace(/\\+theta\b/g, "θ");
  text = text.replace(/\\+Delta\b/g, "Δ");
  text = text.replace(/\\+alpha\b/g, "α");
  text = text.replace(/\\+beta\b/g, "β");
  text = text.replace(/\\+gamma\b/g, "γ");
  text = text.replace(/\\+omega\b/g, "ω");
  text = text.replace(/\\+Omega\b/g, "Ω");
  text = text.replace(/\\+sigma\b/g, "σ");
  text = text.replace(/\\+rho\b/g, "ρ");
  text = text.replace(/\\+epsilon\b/g, "ε");

  // Strip remaining isolated LaTeX backslashes
  text = text.replace(/\\([a-zA-Z]+)/g, "$1");

  // 6. Convert exponent notations (handling multi-digit and signed exponents first!)
  // e.g. 10^{-15} -> 10⁻¹⁵, 10^-15 -> 10⁻¹⁵, m^-3 -> m⁻³, x^2 -> x²
  text = text.replace(/\^\{([0-9+\-ni]+)\}/g, (_, exp) => toSuperscript(exp));
  text = text.replace(/\^([+\-]?[0-9]+)\b/g, (_, exp) => toSuperscript(exp));
  text = text.replace(/([a-zA-Z])\^([+\-]?[0-9]+)/g, (_, base, exp) => `${base}${toSuperscript(exp)}`);

  // 7. Clean up redundant spaces around operators
  text = text.replace(/\s+/g, " ");
  text = text.replace(/\s*([×÷·≠≤≥±])\s*/g, " $1 ");
  text = text.replace(/\(\s+/g, "(");
  text = text.replace(/\s+\)/g, ")");
  text = text.replace(/\s*\/\s*/g, " / ");

  return text.trim();
}

/**
 * Deep recursive math sanitizer for objects, arrays, and primitive values
 */
export function sanitizeMathRecursive<T>(val: T): T {
  if (typeof val === "string") {
    return sanitizeMath(val) as unknown as T;
  }
  if (Array.isArray(val)) {
    return val.map((item) => sanitizeMathRecursive(item)) as unknown as T;
  }
  if (val !== null && typeof val === "object") {
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      res[k] = sanitizeMathRecursive(v);
    }
    return res as unknown as T;
  }
  return val;
}
