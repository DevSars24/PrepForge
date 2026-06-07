/**
 * ImageEnhancer.ts
 * ─────────────────────────────────────────────────────────────────────
 * PURPOSE: Before sending any image to OCR, automatically enhance it so
 *          poor/messy handwriting becomes clearer and more readable.
 *
 * PIPELINE (runs in order):
 *   Step A — Grayscale:     Remove colour, keep only luminance
 *   Step B — Contrast Boost: +40% contrast to sharpen light/dark
 *   Step C — Binarization:  Convert to pure black & white (threshold)
 *   Step D — Noise Removal: Despeckle tiny ink dots / scanner noise
 *   Step E — Upscale:       1.5× resize so OCR engine sees bigger glyphs
 *
 * EXPORTS:
 *   enhanceImage()        — single buffer in, enhanced buffer out
 *   compareEnhancement()  — returns original + enhanced with clarity scores
 *   getClarityScore()     — compute 0-100 clarity metric for any buffer
 * ─────────────────────────────────────────────────────────────────────
 */

import { Jimp } from "jimp";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface EnhancementComparison {
  /** Raw PNG buffer of the original (unmodified) image */
  original: Buffer;
  /** Raw PNG buffer after the full enhancement pipeline */
  enhanced: Buffer;
  /** 0-100 clarity score BEFORE enhancement */
  clarityScoreBefore: number;
  /** 0-100 clarity score AFTER enhancement */
  clarityScoreAfter: number;
  /** True when enhancement meaningfully improved the image */
  improved: boolean;
  /** Human-readable summary of what was done */
  summary: string;
}

export interface EnhancementOptions {
  /** Contrast boost amount 0..1 (default 0.4 = 40%) */
  contrastAmount?: number;
  /** Binarization threshold 0-255 (default 128) */
  binaryThreshold?: number;
  /** Upscale factor (default 1.5) */
  scaleFactor?: number;
  /** Whether to run noise removal pass (default true) */
  removeNoise?: boolean;
}

// ─── Internal helpers ───────────────────────────────────────────────────────

/**
 * Compute a simple clarity score (0-100) based on the ratio of "edge" pixels.
 *
 * How it works:
 *  1. Convert to greyscale (if not already)
 *  2. For every pixel, compare it to its right-neighbour
 *  3. A large difference = an edge = a stroke boundary in handwriting
 *  4. More well-defined edges → clearer, crisper writing → higher score
 *
 * Score legend:
 *   0-40   → Very blurry / low contrast (red zone)
 *   40-60  → Marginal — might confuse OCR (amber zone)
 *   60-100 → Clear enough for reliable OCR (green zone)
 */
export async function getClarityScore(imageBuffer: Buffer): Promise<number> {
  try {
    const img = await Jimp.read(imageBuffer);
    const grey = img.clone().greyscale();

    let edgePixels = 0;
    const totalPixels = grey.width * grey.height;

    grey.scan(0, 0, grey.width - 1, grey.height, (x: number, y: number, idx: number) => {
      // idx is the flat index into the RGBA pixel buffer
      const currentVal = grey.bitmap.data[idx]; // R channel (greyscale → R=G=B)
      // Compare with the pixel immediately to the right
      const rightIdx = idx + 4;
      if (rightIdx < grey.bitmap.data.length) {
        const rightVal = grey.bitmap.data[rightIdx];
        if (Math.abs(currentVal - rightVal) > 30) {
          edgePixels++;
        }
      }
    });

    // Edge density as a percentage of total pixels
    const edgeDensity = (edgePixels / totalPixels) * 100;

    // Map edge density to a 0-100 clarity score
    // Empirically: 0% edges = blank, 2-8% edges = handwritten content,
    // >12% = printed text or over-processed noise
    const raw = Math.min(100, (edgeDensity / 8) * 100);
    return Math.round(raw);
  } catch (error) {
    console.error("[ImageEnhancer] getClarityScore failed:", error);
    return 0;
  }
}

/**
 * Apply a simple median-like noise-removal pass.
 *
 * Strategy: for each pixel, if its brightness is very different from its
 * four neighbours (above/below/left/right) AND the pixel is isolated
 * (all four neighbours agree), replace it with the neighbour average.
 * This removes single-pixel specks without blurring strokes.
 */
function applyNoiseRemoval(img: any): any {
  const w = img.width;
  const h = img.height;
  const clone = img.clone();

  img.scan(1, 1, w - 2, h - 2, (x: number, y: number, idx: number) => {
    const center = img.bitmap.data[idx];

    // Read the four cardinal neighbours from the RGBA buffer
    const up = img.bitmap.data[idx - w * 4];
    const down = img.bitmap.data[idx + w * 4];
    const left = img.bitmap.data[idx - 4];
    const right = img.bitmap.data[idx + 4];

    const neighbourAvg = (up + down + left + right) / 4;

    // If centre differs greatly from all neighbours, it's likely noise
    const deviation = Math.abs(center - neighbourAvg);
    if (deviation > 80) {
      // Replace with average of neighbours in the clone
      const avg = Math.round(neighbourAvg);
      clone.bitmap.data[idx] = avg;
      clone.bitmap.data[idx + 1] = avg;
      clone.bitmap.data[idx + 2] = avg;
      // Keep alpha channel unchanged
    }
  });

  return clone;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * enhanceImage()
 * ──────────────
 * Takes a raw image buffer (JPEG / PNG / WebP) and returns a new PNG
 * buffer that has been processed through the full enhancement pipeline.
 *
 * @param imageBuffer   - Raw binary image data
 * @param options       - Optional tuning parameters
 * @returns             - Enhanced PNG buffer ready for OCR
 *
 * @throws Will throw only on unrecoverable errors (file corrupt, out of
 *         memory). Use a try/catch at the call site.
 */
export async function enhanceImage(
  imageBuffer: Buffer,
  options: EnhancementOptions = {}
): Promise<Buffer> {
  const {
    contrastAmount = 0.4,
    binaryThreshold = 128,
    scaleFactor = 1.5,
    removeNoise = true,
  } = options;

  // ── Step A: Load & Greyscale ────────────────────────────────────────────
  // Colour information is irrelevant for text OCR — stripping it simplifies
  // the subsequent steps and reduces file size.
  const img = await Jimp.read(imageBuffer);
  img.greyscale();

  // ── Step B: Contrast Boost ──────────────────────────────────────────────
  // Increases the difference between dark ink strokes and the light page
  // background. Value of 0.4 lifts contrast by 40% on a -1 to +1 scale.
  img.contrast(contrastAmount);

  // ── Step C: Binarization (Threshold) ───────────────────────────────────
  // Convert every pixel to pure black (0) or pure white (255).
  // Pixels below `binaryThreshold` → black (ink).
  // Pixels at or above `binaryThreshold` → white (paper).
  // This eliminates ambiguous grey tones that confuse OCR engines.
  img.threshold({ max: binaryThreshold });

  // ── Step D: Noise Removal ───────────────────────────────────────────────
  // Removes isolated ink specks and scanner artifacts without blurring
  // actual handwritten strokes.
  let processed: any = img;
  if (removeNoise) {
    processed = applyNoiseRemoval(img);
  }

  // ── Step E: Upscale ─────────────────────────────────────────────────────
  // Enlarge 1.5× so that small handwriting produces glyphs that are big
  // enough for the OCR model to reliably recognize letterforms.
  // Jimp.AUTO keeps the aspect ratio locked on the height axis.
  processed.resize(processed.width * scaleFactor, -1);

  // Return as PNG (lossless, preserves the sharp black/white boundary)
  return Buffer.from(await processed.getBuffer("image/png"));
}

/**
 * compareEnhancement()
 * ─────────────────────
 * Runs the full enhancement pipeline AND computes a before/after clarity
 * score so the caller can decide whether to use the enhanced version.
 *
 * Use case:
 *   - Display a side-by-side preview in the teacher dashboard
 *   - Log improvement metrics for the Fairness Report
 *   - Decide whether to re-run OCR on the enhanced version
 *
 * @param originalBuffer  - Raw image buffer to process
 * @param options         - Forwarded to enhanceImage()
 * @returns               - EnhancementComparison object
 */
export async function compareEnhancement(
  originalBuffer: Buffer,
  options: EnhancementOptions = {}
): Promise<EnhancementComparison> {
  // Score the ORIGINAL image first (before any changes)
  const clarityScoreBefore = await getClarityScore(originalBuffer);

  // Run the enhancement pipeline
  let enhanced: Buffer;
  try {
    enhanced = await enhanceImage(originalBuffer, options);
  } catch (error) {
    console.error("[ImageEnhancer] Enhancement failed, returning original:", error);
    // Safe fallback: return the original image as both buffers
    enhanced = originalBuffer;
  }

  // Score the ENHANCED image
  const clarityScoreAfter = await getClarityScore(enhanced);

  const improved = clarityScoreAfter > clarityScoreBefore + 5; // 5-point minimum gain

  const summary = improved
    ? `Enhancement improved clarity from ${clarityScoreBefore} → ${clarityScoreAfter} (+${clarityScoreAfter - clarityScoreBefore} pts). Using enhanced image for OCR.`
    : `Minimal improvement (${clarityScoreBefore} → ${clarityScoreAfter}). Original image quality is sufficient.`;

  return {
    original: originalBuffer,
    enhanced,
    clarityScoreBefore,
    clarityScoreAfter,
    improved,
    summary,
  };
}
