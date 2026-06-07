"use client";

/**
 * ReviewQueue.tsx
 * ─────────────────────────────────────────────────────────────────────
 * PURPOSE: Teacher review UI — shows ONLY the flagged (amber/red) words
 *          from a page's OCR output. Teacher corrects them in ~10-15 s/page.
 *
 * LAYOUT:
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  📋 Review Queue — 23 pages need review                  │
 *   │  ████████░░░░░░░  12/23 done                             │
 *   ├─────────────────────┬────────────────────────────────────┤
 *   │                     │  OCR Output:                       │
 *   │  [Zoomable          │                                    │
 *   │   original image]   │  "... use hota hai in              │
 *   │                     │  [chiorophyil] ← RED               │
 *   │                     │  [photosythsis] ← RED ..."         │
 *   ├─────────────────────┴────────────────────────────────────┤
 *   │  Flagged word: "chiorophyil"                             │
 *   │  Correct it:  [chlorophyll          ] ✏️                 │
 *   │  [Skip]  [Confirm & Next →]                              │
 *   └──────────────────────────────────────────────────────────┘
 *
 * KEYBOARD SHORTCUTS:
 *   Enter → Confirm & move to next flagged word
 *   Tab   → Skip current word (leave OCR reading as-is)
 *   Escape → Cancel correction input
 *
 * PROPS:
 *   pages            — array of pages needing review
 *   onReviewComplete — called when teacher has cleared all pages
 *   onPageDone       — called after each page is confirmed
 * ─────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import type { ScoredWord, ConfidenceResult } from "./ConfidenceScorer";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ReviewPage {
  /** Unique page identifier */
  id: string;
  /** Human-readable label, e.g. "Student: Aryan Sharma — Page 2" */
  label: string;
  /** Base-64 data URL of the original scanned image */
  imageDataUrl: string;
  /** Confidence analysis from ConfidenceScorer */
  confidenceResult: ConfidenceResult;
  /** Student roll number for linking back to the record */
  studentRoll: string;
}

export interface WordCorrection {
  /** Original word as read by OCR */
  original: string;
  /** Teacher's corrected version */
  corrected: string;
  /** Position in transcript */
  position: { line: number; index: number };
}

export interface PageReviewResult {
  pageId: string;
  studentRoll: string;
  corrections: WordCorrection[];
  /** Corrected full text (original with flagged words replaced) */
  correctedText: string;
  /** ISO timestamp when teacher finished */
  reviewedAt: string;
  /** Total seconds spent on this page */
  timeTakenSeconds: number;
}

interface ReviewQueueProps {
  /** Pages that require teacher review (red or amber zone) */
  pages: ReviewPage[];
  /** Called when ALL pages have been reviewed */
  onReviewComplete: (results: PageReviewResult[]) => void;
  /** Called after EACH individual page is done (for incremental saving) */
  onPageDone?: (result: PageReviewResult) => void;
}

// ─── Helper: build corrected text ───────────────────────────────────────────

/**
 * Rebuild the full transcript with teacher corrections applied.
 * Works by reconstructing line-by-line, replacing flagged words at their
 * recorded position with the teacher-provided correction.
 */
function buildCorrectedText(
  originalText: string,
  corrections: WordCorrection[]
): string {
  const lines = originalText.split(/\n+/).map((l) => l.split(/\s+/).filter(Boolean));
  const corrMap = new Map<string, string>();

  corrections.forEach((c) => {
    corrMap.set(`${c.position.line}:${c.position.index}`, c.corrected);
  });

  return lines
    .map((lineWords, lineIdx) =>
      lineWords
        .map((word, wordIdx) => corrMap.get(`${lineIdx}:${wordIdx}`) ?? word)
        .join(" ")
    )
    .join("\n");
}

// ─── Helper: format elapsed time ────────────────────────────────────────────

function formatSeconds(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
}

// ─── Subcomponent: OcrTextDisplay ───────────────────────────────────────────

/**
 * Renders the full OCR transcript with flagged words highlighted.
 * Clicking a highlighted word focuses the correction input.
 */
interface OcrTextDisplayProps {
  words: ScoredWord[];
  currentFlagIndex: number | null;
  flaggedWords: ScoredWord[];
  onWordClick: (flagIdx: number) => void;
}

function OcrTextDisplay({
  words,
  currentFlagIndex,
  flaggedWords,
  onWordClick,
}: OcrTextDisplayProps) {
  // Build a lookup: "line:index" → flag index (for click handling)
  const flagMap = new Map<string, number>();
  flaggedWords.forEach((fw, fi) => {
    flagMap.set(`${fw.position.line}:${fw.position.index}`, fi);
  });

  // Group words by line
  const maxLine = words.reduce((m, w) => Math.max(m, w.position.line), 0);
  const lineGroups: ScoredWord[][] = Array.from({ length: maxLine + 1 }, () => []);
  words.forEach((w) => {
    if (lineGroups[w.position.line]) {
      lineGroups[w.position.line][w.position.index] = w;
    }
  });

  return (
    <div className="font-mono text-sm leading-7 whitespace-pre-wrap break-words">
      {lineGroups.map((lineWords, lineIdx) => (
        <div key={lineIdx} className="mb-1">
          {lineWords.map((w, wordIdx) => {
            if (!w) return <span key={wordIdx}> </span>;
            const key = `${w.position.line}:${w.position.index}`;
            const flagIdx = flagMap.get(key);
            const isFlagged = flagIdx !== undefined;
            const isCurrent = flagIdx === currentFlagIndex;

            if (!isFlagged) {
              return (
                <span key={wordIdx} className="text-gray-200">
                  {w.word}{" "}
                </span>
              );
            }

            // Colour by zone
            const zoneStyles: Record<string, string> = {
              red: "bg-red-500/20 text-red-300 border border-red-500/50",
              amber: "bg-amber-500/20 text-amber-300 border border-amber-500/50",
              green: "text-green-300",
            };

            return (
              <span
                key={wordIdx}
                onClick={() => onWordClick(flagIdx)}
                className={`
                  cursor-pointer rounded px-1 py-0.5 mx-0.5 transition-all duration-150
                  ${zoneStyles[w.zone] || ""}
                  ${isCurrent ? "ring-2 ring-white ring-offset-1 ring-offset-gray-900 scale-105" : "hover:scale-105 hover:opacity-90"}
                `}
                title={`Zone: ${w.zone.toUpperCase()} | Alt reading: "${w.alternateReading}" | Confidence: ${w.confidence}%`}
              >
                {w.word}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ReviewQueue({
  pages,
  onReviewComplete,
  onPageDone,
}: ReviewQueueProps) {
  // ── State ─────────────────────────────────────────────────────────────
  const [pageIndex, setPageIndex] = useState(0);
  const [flagWordIndex, setFlagWordIndex] = useState(0);
  const [corrections, setCorrections] = useState<WordCorrection[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [completedPages, setCompletedPages] = useState<PageReviewResult[]>([]);
  const [pageStartTime, setPageStartTime] = useState(Date.now());
  const [totalTimeSavedSeconds, setTotalTimeSavedSeconds] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // ── Derived values ────────────────────────────────────────────────────
  const currentPage = pages[pageIndex];
  const isComplete = pageIndex >= pages.length;

  // Collect only red + amber words for this page (skip greens)
  const flaggedWords = currentPage
    ? currentPage.confidenceResult.words.filter(
        (w) => w.zone === "red" || w.zone === "amber"
      )
    : [];

  const currentFlagWord = flaggedWords[flagWordIndex] ?? null;

  // Estimate time saved: a human typist takes ~3 s/word on average
  const HUMAN_SECONDS_PER_WORD = 3;

  // ── Focus input when flagged word changes ─────────────────────────────
  useEffect(() => {
    if (currentFlagWord) {
      setInputValue(currentFlagWord.word);
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [flagWordIndex, pageIndex, currentFlagWord]);

  // Reset state when starting a new page
  useEffect(() => {
    setFlagWordIndex(0);
    setCorrections([]);
    setInputValue("");
    setPageStartTime(Date.now());
  }, [pageIndex]);

  // ── Handlers ─────────────────────────────────────────────────────────

  const confirmCurrentWord = useCallback(() => {
    if (!currentFlagWord) return;

    const correctedWord = inputValue.trim() || currentFlagWord.word;

    // Record correction only if teacher actually changed something
    if (correctedWord !== currentFlagWord.word) {
      setCorrections((prev) => [
        ...prev,
        {
          original: currentFlagWord.word,
          corrected: correctedWord,
          position: currentFlagWord.position,
        },
      ]);

      // Update time-saved estimate
      setTotalTimeSavedSeconds((prev) => prev + HUMAN_SECONDS_PER_WORD);
    }

    advanceToNextFlag();
  }, [currentFlagWord, inputValue]);

  const skipCurrentWord = useCallback(() => {
    advanceToNextFlag();
  }, [flagWordIndex, flaggedWords.length]);

  const advanceToNextFlag = useCallback(() => {
    if (flagWordIndex < flaggedWords.length - 1) {
      // More flagged words on this page
      setFlagWordIndex((i) => i + 1);
    } else {
      // Page complete — save result and move on
      finishCurrentPage();
    }
  }, [flagWordIndex, flaggedWords.length, corrections, currentPage, pageStartTime]);

  const finishCurrentPage = useCallback(() => {
    if (!currentPage) return;
    const timeTakenSeconds = Math.round((Date.now() - pageStartTime) / 1000);

    const result: PageReviewResult = {
      pageId: currentPage.id,
      studentRoll: currentPage.studentRoll,
      corrections,
      correctedText: buildCorrectedText(
        currentPage.confidenceResult.fullText,
        corrections
      ),
      reviewedAt: new Date().toISOString(),
      timeTakenSeconds,
    };

    const updated = [...completedPages, result];
    setCompletedPages(updated);
    onPageDone?.(result);

    if (pageIndex + 1 >= pages.length) {
      // All pages done
      onReviewComplete(updated);
    } else {
      setPageIndex((i) => i + 1);
    }
  }, [
    currentPage,
    corrections,
    completedPages,
    pageIndex,
    pages.length,
    pageStartTime,
    onPageDone,
    onReviewComplete,
  ]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmCurrentWord();
      } else if (e.key === "Tab") {
        e.preventDefault();
        skipCurrentWord();
      } else if (e.key === "Escape") {
        setInputValue(currentFlagWord?.word ?? "");
        inputRef.current?.blur();
      }
    },
    [confirmCurrentWord, skipCurrentWord, currentFlagWord]
  );

  // ─── RENDER: All done ──────────────────────────────────────────────────
  if (isComplete) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-gray-900 rounded-2xl border border-gray-700 p-10 text-center">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Review Queue Complete!
          </h2>
          <p className="text-gray-400 mb-6">
            All {pages.length} pages have been reviewed.
          </p>
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-green-300 text-sm">
            ⏱️ Estimated time saved vs. full manual grading:{" "}
            <span className="font-bold">
              {formatSeconds(totalTimeSavedSeconds)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentPage) return null;

  const progressPercent = Math.round((pageIndex / pages.length) * 100);
  const wordProgressPercent =
    flaggedWords.length > 0
      ? Math.round((flagWordIndex / flaggedWords.length) * 100)
      : 100;

  // ─── RENDER: Main review UI ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <h1 className="text-lg font-bold text-white">Review Queue</h1>
                <p className="text-sm text-gray-400">
                  {pages.length - pageIndex} pages remaining
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Time saved so far</p>
              <p className="text-green-400 font-bold">
                ⏱️ {formatSeconds(totalTimeSavedSeconds)}
              </p>
            </div>
          </div>

          {/* Overall progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {pageIndex}/{pages.length} pages
            </span>
          </div>
        </div>
      </div>

      {/* ── Current page label ──────────────────────────────────────────── */}
      <div className="bg-gray-900/60 border-b border-gray-800 px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className="text-sm text-gray-300">
            📄 <span className="font-medium">{currentPage.label}</span>
          </p>
          <span className="text-xs text-gray-500">
            Page confidence:{" "}
            <span
              className={
                currentPage.confidenceResult.pageConfidence >= 80
                  ? "text-green-400"
                  : currentPage.confidenceResult.pageConfidence >= 50
                  ? "text-amber-400"
                  : "text-red-400"
              }
            >
              {currentPage.confidenceResult.pageConfidence}%
            </span>
          </span>
        </div>
      </div>

      {/* ── Main Content: Two Columns ──────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full p-4 gap-4">

        {/* LEFT: Zoomable original image */}
        <div className="w-1/2 bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
            <span className="text-sm text-gray-400">🔍 Original scan</span>
            <span className="text-xs text-gray-600">
              (pinch/scroll to zoom)
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={5}
              centerOnInit
            >
              <TransformComponent
                wrapperStyle={{ width: "100%", height: "100%" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentPage.imageDataUrl}
                  alt={`Original scan: ${currentPage.label}`}
                  className="max-w-full object-contain"
                />
              </TransformComponent>
            </TransformWrapper>
          </div>
        </div>

        {/* RIGHT: OCR text with highlights + correction input */}
        <div className="w-1/2 flex flex-col gap-3">

          {/* OCR text panel */}
          <div className="flex-1 bg-gray-900 rounded-2xl border border-gray-700 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <span className="text-sm text-gray-400">📝 OCR Output</span>
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-red-500/20 text-red-300 border border-red-500/40 rounded px-2 py-0.5">
                  RED = must fix
                </span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded px-2 py-0.5">
                  AMBER = check
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <OcrTextDisplay
                words={currentPage.confidenceResult.words}
                currentFlagIndex={flagWordIndex}
                flaggedWords={flaggedWords}
                onWordClick={(fi) => setFlagWordIndex(fi)}
              />
            </div>
          </div>

          {/* Correction panel */}
          <div className="bg-gray-900 rounded-2xl border border-gray-700 p-5">

            {/* Word progress within this page */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500">
                Word {flagWordIndex + 1} of {flaggedWords.length} flagged on this page
              </p>
              <div className="flex-1 mx-3 bg-gray-800 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-indigo-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${wordProgressPercent}%` }}
                />
              </div>
            </div>

            {currentFlagWord ? (
              <>
                {/* Zone badge + flagged word */}
                <div className="mb-3 flex items-center gap-3">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      currentFlagWord.zone === "red"
                        ? "bg-red-500/20 text-red-300 border border-red-500/40"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    {currentFlagWord.zone}
                  </span>
                  <p className="text-sm text-gray-300">
                    Flagged word:{" "}
                    <code className="bg-gray-800 px-2 py-0.5 rounded text-white font-mono">
                      "{currentFlagWord.word}"
                    </code>
                  </p>
                </div>

                {/* Alternate reading info */}
                {currentFlagWord.isDisagreement && (
                  <p className="text-xs text-gray-500 mb-3">
                    Alt reading (enhanced OCR):{" "}
                    <code className="text-gray-400">
                      "{currentFlagWord.alternateReading}"
                    </code>{" "}
                    | Confidence: {currentFlagWord.confidence}%
                  </p>
                )}

                {/* Correction input */}
                <label className="block text-sm text-gray-400 mb-1.5">
                  ✏️ Correct it:
                </label>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type correct word..."
                    className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                    autoFocus
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={skipCurrentWord}
                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Skip (Tab)
                  </button>
                  <button
                    onClick={confirmCurrentWord}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    Confirm & Next →
                    <kbd className="text-xs bg-indigo-900 px-1.5 py-0.5 rounded">
                      Enter
                    </kbd>
                  </button>
                </div>
              </>
            ) : (
              /* No more flagged words — show finish button */
              <div className="text-center py-4">
                <p className="text-green-400 font-medium mb-3">
                  ✅ All flagged words reviewed for this page!
                </p>
                <button
                  onClick={finishCurrentPage}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Save & Go to Next Page →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
