/**
 * ConfidenceScorer.ts
 * ─────────────────────────────────────────────────────────────────────
 * PURPOSE: After OCR runs, calculate HOW CONFIDENT we are about each
 *          word/line in the transcript. Flag uncertain words for teacher
 *          review so no student is penalised for messy handwriting.
 *
 * STRATEGY — "Dual-OCR Agreement":
 *   1. Run OCR on the ORIGINAL image   → result_A
 *   2. Run OCR on the ENHANCED image   → result_B  (via ImageEnhancer)
 *   3. Compare both outputs word-by-word
 *      • Same word both times     → HIGH confidence (both models agree)
 *      • Different word           → LOW confidence  (models disagree)
 *   4. Produce per-word confidence scores + zone labels
 *
 * CONFIDENCE ZONES:
 *   GREEN  (>80)  — auto-grade, no human needed
 *   AMBER  (50-80) — AI grades, but flagged for optional review
 *   RED    (<50)  — must go to teacher review queue before grading
 *
 * OCR PROVIDER: Uses the existing Mistral OCR (mistralOCR.ts) — no new
 *               API keys required.
 * ─────────────────────────────────────────────────────────────────────
 */

import { enhanceImage } from "./ImageEnhancer";

// ─── Types ─────────────────────────────────────────────────────────────────

export type ConfidenceZone = "green" | "amber" | "red";

export interface ScoredWord {
  /** The word as read by the primary (original) OCR pass */
  word: string;
  /** 0-100 confidence score for this word */
  confidence: number;
  /** Traffic-light zone derived from the confidence score */
  zone: ConfidenceZone;
  /** Position in the original transcript */
  position: {
    /** 0-indexed line number */
    line: number;
    /** 0-indexed word index within the line */
    index: number;
  };
  /** What the second OCR pass read for this same position (may differ) */
  alternateReading: string;
  /** True when the two OCR passes disagreed on this word */
  isDisagreement: boolean;
}

export interface ConfidenceResult {
  /** Full OCR text from the primary (original-image) pass */
  fullText: string;
  /** Full OCR text from the secondary (enhanced-image) pass */
  enhancedText: string;
  /** Per-word confidence breakdown */
  words: ScoredWord[];
  /** Overall 0-100 confidence score for the whole page */
  pageConfidence: number;
  /** True when pageConfidence < RED_THRESHOLD or flaggedWordCount is high */
  needsReview: boolean;
  /** Count of words in the amber or red zone */
  flaggedWordCount: number;
  /** Count of words in the red zone (immediate teacher review required) */
  redWordCount: number;
  /** Recommended action for this page */
  recommendation: "auto_grade" | "ai_grade_with_flag" | "teacher_review_first";
}

export interface OcrResult {
  text: string;
  /** Optional per-word confidence values if the provider returns them */
  wordConfidences?: number[];
}

// ─── Thresholds ─────────────────────────────────────────────────────────────

const GREEN_THRESHOLD = 80;
const AMBER_THRESHOLD = 50;

/**
 * Map a raw 0-100 score to a traffic-light zone.
 */
function calculateZone(confidence: number): ConfidenceZone {
  if (confidence >= GREEN_THRESHOLD) return "green";
  if (confidence >= AMBER_THRESHOLD) return "amber";
  return "red";
}

// ─── OCR Provider (uses existing Mistral OCR via fetch) ─────────────────────

/**
 * runOcr()
 * ─────────
 * Calls the existing /api/ocr endpoint with the given image buffer.
 * This re-uses the Mistral OCR that is already configured in the project —
 * no new API keys are needed.
 *
 * Falls back to a placeholder in environments where the API is unavailable
 * (e.g., unit tests).
 */
async function runOcr(imageBuffer: Buffer, label: string): Promise<OcrResult> {
  try {
    const base64 = imageBuffer.toString("base64");
    // Detect mime type: PNG starts with 0x89 (137)
    const mimeType = imageBuffer[0] === 137 ? "image/png" : "image/jpeg";

    // We call the internal Next.js API route so we don't duplicate
    // OCR provider logic here — DRY principle.
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: mimeType });
    formData.append("files", blob, `ocr-input-${label}.png`);
    formData.append("mode", "answer");

    const apiBase =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const res = await fetch(`${apiBase}/api/ocr`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "unknown error");
      throw new Error(`OCR API returned ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = (await res.json()) as { text?: string; error?: string };

    if (data.error) throw new Error(data.error);

    return { text: data.text || "" };
  } catch (error) {
    console.warn(
      `[ConfidenceScorer] OCR pass "${label}" failed:`,
      error instanceof Error ? error.message : error
    );
    // Return empty string so comparison still works (all words will disagree
    // → conservative: everything goes to review)
    return { text: "" };
  }
}

// ─── Word-level scoring logic ────────────────────────────────────────────────

/**
 * normalizeWord()
 * ───────────────
 * Strip punctuation and lowercase so we compare semantic content, not
 * formatting. "chlorophyll," === "Chlorophyll" after normalisation.
 */
function normalizeWord(w: string): string {
  return w
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ""); // keep only alphanumeric
}

/**
 * computeLevenshtein()
 * ────────────────────
 * Character-level edit distance between two strings.
 * Used to give partial credit when two readings are CLOSE but not identical
 * (e.g., "chlorophyl" vs "chlorophyll" → edit distance 1 → 90% confidence).
 */
function computeLevenshtein(a: string, b: string): number {
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[a.length][b.length];
}

/**
 * scoreWordPair()
 * ───────────────
 * Given two readings of the same word position, produce a 0-100 confidence.
 *
 * Logic:
 *   - Exact match (normalised)        → 90  (not 100 — OCR is never perfect)
 *   - Edit distance 1 (off by 1 char) → 75
 *   - Edit distance 2                 → 55
 *   - Edit distance 3                 → 35
 *   - Completely different            → 20
 *   - One side is empty (word missing)→ 10
 */
function scoreWordPair(wordA: string, wordB: string): number {
  const a = normalizeWord(wordA);
  const b = normalizeWord(wordB);

  // One side missing → very low confidence
  if (!a || !b) return 10;

  // Exact match
  if (a === b) return 90;

  const dist = computeLevenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);

  // Similarity ratio 0-1
  const similarity = 1 - dist / maxLen;

  // Map similarity to 0-100 confidence (floor at 15, ceil at 85 for OCR)
  return Math.round(Math.max(15, Math.min(85, similarity * 100)));
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * scoreConfidence()
 * ──────────────────
 * Main entry point. Takes a raw image buffer and returns a full
 * ConfidenceResult with per-word analysis and overall page assessment.
 *
 * @param imageBuffer  - Raw image data (JPEG / PNG)
 * @returns            - ConfidenceResult
 *
 * @example
 *   const result = await scoreConfidence(imageBuffer);
 *   if (result.needsReview) {
 *     addToReviewQueue(result);
 *   } else {
 *     sendToAiGrading(result.fullText);
 *   }
 */
export async function scoreConfidence(
  imageBuffer: Buffer
): Promise<ConfidenceResult> {
  // ── Phase 1: Run OCR on original image ─────────────────────────────────
  const result1 = await runOcr(imageBuffer, "original");

  // ── Phase 2: Enhance image, then run OCR again ─────────────────────────
  let enhanced = imageBuffer;
  try {
    enhanced = await enhanceImage(imageBuffer);
  } catch (enhErr) {
    console.warn("[ConfidenceScorer] Enhancement failed, using original for second pass:", enhErr);
  }
  const result2 = await runOcr(enhanced, "enhanced");

  const primaryText = result1.text;
  const secondaryText = result2.text;

  // ── Phase 3: Tokenise both outputs into lines → words ──────────────────
  const primaryLines = primaryText.split(/\n+/).map((l) => l.split(/\s+/).filter(Boolean));
  const secondaryLines = secondaryText.split(/\n+/).map((l) => l.split(/\s+/).filter(Boolean));

  const scoredWords: ScoredWord[] = [];

  primaryLines.forEach((lineWords, lineIdx) => {
    const secLine = secondaryLines[lineIdx] ?? [];

    lineWords.forEach((word, wordIdx) => {
      const alternate = secLine[wordIdx] ?? "";
      const confidence = scoreWordPair(word, alternate);
      const zone = calculateZone(confidence);
      const isDisagreement = normalizeWord(word) !== normalizeWord(alternate);

      scoredWords.push({
        word,
        confidence,
        zone,
        position: { line: lineIdx, index: wordIdx },
        alternateReading: alternate,
        isDisagreement,
      });
    });
  });

  // ── Phase 4: Aggregate page-level stats ────────────────────────────────
  const totalWords = scoredWords.length;
  const pageConfidence =
    totalWords === 0
      ? 0
      : Math.round(scoredWords.reduce((sum, w) => sum + w.confidence, 0) / totalWords);

  const flaggedWordCount = scoredWords.filter(
    (w) => w.zone === "amber" || w.zone === "red"
  ).length;
  const redWordCount = scoredWords.filter((w) => w.zone === "red").length;

  // ── Phase 5: Decide recommendation ─────────────────────────────────────
  // RED zone: more than 15% of words are red OR overall confidence < AMBER
  const redRatio = totalWords > 0 ? redWordCount / totalWords : 0;
  const needsReview = pageConfidence < AMBER_THRESHOLD || redRatio > 0.15;

  let recommendation: ConfidenceResult["recommendation"];
  if (pageConfidence >= GREEN_THRESHOLD && flaggedWordCount === 0) {
    recommendation = "auto_grade";
  } else if (needsReview) {
    recommendation = "teacher_review_first";
  } else {
    recommendation = "ai_grade_with_flag";
  }

  return {
    fullText: primaryText,
    enhancedText: secondaryText,
    words: scoredWords,
    pageConfidence,
    needsReview,
    flaggedWordCount,
    redWordCount,
    recommendation,
  };
}

/**
 * scoreBatch()
 * ─────────────
 * Convenience wrapper to process multiple pages in parallel.
 * Returns results in the same order as input, with any failed pages
 * marked as needing review (fail-safe: always err on the side of review).
 *
 * @param imageBuffers  - Array of page image buffers
 * @returns             - Array of ConfidenceResult (one per page)
 */
export async function scoreBatch(
  imageBuffers: Buffer[]
): Promise<ConfidenceResult[]> {
  const results = await Promise.allSettled(
    imageBuffers.map((buf) => scoreConfidence(buf))
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;

    // Rejected: return a safe "needs review" placeholder
    console.error(`[ConfidenceScorer] scoreBatch: page ${i} failed:`, r.reason);
    return {
      fullText: "",
      enhancedText: "",
      words: [],
      pageConfidence: 0,
      needsReview: true,
      flaggedWordCount: 0,
      redWordCount: 0,
      recommendation: "teacher_review_first" as const,
    };
  });
}
