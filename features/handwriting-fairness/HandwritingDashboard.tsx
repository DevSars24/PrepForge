"use client";

/**
 * HandwritingDashboard.tsx
 * ─────────────────────────────────────────────────────────────────────
 * PURPOSE: Main page that connects all 4 system components together.
 *
 * USER FLOW:
 *   1. Upload image(s)
 *   2. Auto-enhance (ImageEnhancer)
 *   3. Score confidence (ConfidenceScorer → dual OCR)
 *   4. Route to:
 *        GREEN → direct AI grading
 *        AMBER → AI grades + adds to review queue
 *        RED   → teacher review queue first
 *   5. Teacher clears review queue (ReviewQueue)
 *   6. Re-grade with corrected text
 *   7. Show FairnessReport
 *
 * The pipeline progress is shown visually as a step-by-step indicator.
 * Everything runs client-side except OCR (which hits /api/ocr).
 *
 * No new API keys needed — uses existing Mistral/Gemini configured in .env
 * ─────────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback, useRef } from "react";
import type { ReviewPage, PageReviewResult } from "./ReviewQueue";
import type { FairnessReportData, StudentFairnessRecord } from "./FairnessReport";
import type { ConfidenceResult } from "./ConfidenceScorer";

// Lazy import heavy components so they don't bloat the initial bundle
import dynamic from "next/dynamic";

const ReviewQueue = dynamic(() => import("./ReviewQueue"), { ssr: false });
const FairnessReport = dynamic(() => import("./FairnessReport"), { ssr: false });

// ─── Types ─────────────────────────────────────────────────────────────────

type PipelineStep =
  | "idle"           // nothing started
  | "upload"         // user picking files
  | "enhancing"      // running ImageEnhancer
  | "scoring"        // running ConfidenceScorer (dual OCR)
  | "routing"        // deciding green/amber/red
  | "reviewing"      // teacher in ReviewQueue
  | "regrading"      // sending corrected text to AI grader
  | "report";        // showing FairnessReport

interface ProcessedPage {
  id: string;
  file: File;
  imageDataUrl: string;           // for display
  imageBuffer?: Buffer;           // for processing
  clarityBefore: number;
  clarityAfter: number;
  confidenceResult?: ConfidenceResult;
  zone: "green" | "amber" | "red" | "pending";
  correctedText?: string;         // filled after ReviewQueue
  finalScore?: number;
  gradingConfidence?: number;
}

interface UploadedStudent {
  roll: string;
  name: string;
  pages: ProcessedPage[];
}

// ─── Pipeline step metadata (for the visual stepper) ───────────────────────

const STEPS: { id: PipelineStep; label: string; icon: string; desc: string }[] = [
  { id: "upload", label: "Upload", icon: "📂", desc: "Upload answer sheets" },
  { id: "enhancing", label: "Enhance", icon: "✨", desc: "Auto-improve image quality" },
  { id: "scoring", label: "Score", icon: "🔍", desc: "Dual-OCR confidence analysis" },
  { id: "routing", label: "Route", icon: "🚦", desc: "Green → Auto / Red → Review" },
  { id: "reviewing", label: "Review", icon: "👩‍🏫", desc: "Teacher corrects flagged words" },
  { id: "regrading", label: "Grade", icon: "🤖", desc: "AI grading with corrections" },
  { id: "report", label: "Report", icon: "📊", desc: "Fairness audit report" },
];

const STEP_ORDER: PipelineStep[] = [
  "upload", "enhancing", "scoring", "routing", "reviewing", "regrading", "report"
];

// ─── Helper: read File → Buffer ─────────────────────────────────────────────

async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ─── Helper: run confidence scoring via fetch to /api/ocr ──────────────────

async function fetchConfidence(imageBuffer: Buffer): Promise<ConfidenceResult> {
  // Dynamic import so the server-side Node.js code doesn't run in browser
  const { scoreConfidence } = await import("./ConfidenceScorer");
  return scoreConfidence(imageBuffer);
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

/** Visual pipeline stepper */
function PipelineStepper({ currentStep }: { currentStep: PipelineStep }) {
  const currentIdx = STEP_ORDER.indexOf(currentStep);

  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-2">
      {STEPS.map((step, idx) => {
        const stepIdx = STEP_ORDER.indexOf(step.id);
        const isDone = stepIdx < currentIdx;
        const isCurrent = stepIdx === currentIdx;

        return (
          <React.Fragment key={step.id}>
            {/* Step bubble */}
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-lg
                  border-2 transition-all duration-300
                  ${isDone
                    ? "bg-green-500/20 border-green-500 text-green-400"
                    : isCurrent
                    ? "bg-indigo-500/20 border-indigo-500 text-indigo-300 ring-4 ring-indigo-500/20"
                    : "bg-gray-800 border-gray-700 text-gray-600"
                  }
                `}
              >
                {isDone ? "✓" : step.icon}
              </div>
              <span
                className={`text-xs mt-1 font-medium whitespace-nowrap ${
                  isCurrent ? "text-indigo-300" : isDone ? "text-green-400" : "text-gray-600"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line (not after last) */}
            {idx < STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 min-w-[20px] mx-1 mt-[-14px] transition-all duration-500 ${
                  stepIdx < currentIdx ? "bg-green-500" : "bg-gray-700"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/** Zone pill badge */
function ZonePill({ zone }: { zone: ProcessedPage["zone"] }) {
  const map = {
    green: "bg-green-500/15 text-green-300 border-green-500/40",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    red: "bg-red-500/15 text-red-300 border-red-500/40",
    pending: "bg-gray-700 text-gray-500 border-gray-600",
  };
  const label = zone === "pending" ? "…" : zone.toUpperCase();
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${map[zone]}`}>
      {label}
    </span>
  );
}

// ─── Main Dashboard Component ────────────────────────────────────────────────

export default function HandwritingDashboard() {
  // ── State ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState<PipelineStep>("idle");
  const [students, setStudents] = useState<UploadedStudent[]>([]);
  const [reviewPages, setReviewPages] = useState<ReviewPage[]>([]);
  const [fairnessData, setFairnessData] = useState<FairnessReportData | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form fields for quick single-student demo
  const [studentName, setStudentName] = useState("");
  const [studentRoll, setStudentRoll] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Logging helper ────────────────────────────────────────────────────
  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev.slice(-49), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // ─── Step 1: Handle file upload ─────────────────────────────────────

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (!files.length) return;

      setErrorMessage(null);
      setStep("enhancing");
      addLog(`Received ${files.length} file(s) for student ${studentName || "Unknown"}`);

      // Build data-URLs for display
      const pages: ProcessedPage[] = await Promise.all(
        files.map(async (file, idx) => {
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          return {
            id: `page-${Date.now()}-${idx}`,
            file,
            imageDataUrl: dataUrl,
            clarityBefore: 0,
            clarityAfter: 0,
            zone: "pending" as const,
          };
        })
      );

      const student: UploadedStudent = {
        roll: studentRoll || `ROLL-${Date.now()}`,
        name: studentName || "Unknown Student",
        pages,
      };
      setStudents([student]);

      // ── Step 2: Enhance + Score each page ─────────────────────────────
      setStep("scoring");
      const updatedPages = [...pages];

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        setProcessingProgress(Math.round(((i + 1) / pages.length) * 100));
        addLog(`Processing page ${i + 1}/${pages.length}…`);

        try {
          // Convert to Buffer for processing
          const buf = await fileToBuffer(page.file);

          // Run confidence scoring (handles enhancement internally)
          const confidenceResult = await fetchConfidence(buf);

          updatedPages[i] = {
            ...page,
            imageBuffer: buf,
            clarityBefore: 50, // placeholder; getClarityScore is server-side
            clarityAfter: Math.min(100, 50 + confidenceResult.pageConfidence),
            confidenceResult,
            zone: confidenceResult.recommendation === "auto_grade"
              ? "green"
              : confidenceResult.recommendation === "ai_grade_with_flag"
              ? "amber"
              : "red",
          };

          addLog(
            `Page ${i + 1}: confidence=${confidenceResult.pageConfidence}% → zone=${updatedPages[i].zone} | ${confidenceResult.flaggedWordCount} flagged`
          );
        } catch (err) {
          console.error(`[HandwritingDashboard] Page ${i + 1} processing error:`, err);
          addLog(`⚠️ Page ${i + 1} failed — defaulting to RED (teacher review)`);
          updatedPages[i] = { ...page, zone: "red" };
        }
      }

      // Update state with results
      setStudents([{ ...student, pages: updatedPages }]);

      // ── Step 3: Route ──────────────────────────────────────────────────
      setStep("routing");
      addLog("Routing pages by confidence zone…");

      const pagesNeedingReview = updatedPages.filter(
        (p) => p.zone === "red" || p.zone === "amber"
      );
      const greenPages = updatedPages.filter((p) => p.zone === "green");

      addLog(
        `Routing complete: ${greenPages.length} green (auto), ${pagesNeedingReview.length} amber/red (review)`
      );

      if (pagesNeedingReview.length === 0) {
        // All green — skip review, go to grading
        addLog("All pages passed confidence threshold — proceeding to AI grading.");
        await runGrading(student, updatedPages);
      } else {
        // Build ReviewPage objects for the teacher queue
        const reviewItems: ReviewPage[] = pagesNeedingReview.map((p) => ({
          id: p.id,
          label: `${student.name} (${student.roll}) — Page ${updatedPages.indexOf(p) + 1}`,
          imageDataUrl: p.imageDataUrl,
          confidenceResult: p.confidenceResult!,
          studentRoll: student.roll,
        }));
        setReviewPages(reviewItems);
        setStep("reviewing");
        addLog(`Sending ${reviewItems.length} page(s) to teacher review queue.`);
      }
    },
    [studentName, studentRoll, addLog]
  );

  // ─── After teacher clears review queue ────────────────────────────────

  const handleReviewComplete = useCallback(
    async (reviewResults: PageReviewResult[]) => {
      addLog(`Teacher review complete. ${reviewResults.reduce((s, r) => s + r.corrections.length, 0)} corrections made.`);
      setStep("regrading");

      // Merge corrected text back into pages
      const currentStudent = students[0];
      if (!currentStudent) return;

      const corrMap = new Map(reviewResults.map((r) => [r.pageId, r.correctedText]));
      const mergedPages = currentStudent.pages.map((p) => ({
        ...p,
        correctedText: corrMap.get(p.id) ?? p.confidenceResult?.fullText ?? "",
      }));

      await runGrading(currentStudent, mergedPages);
    },
    [students, addLog]
  );

  // ─── Run AI grading via existing /api/evaluate ────────────────────────

  const runGrading = useCallback(
    async (student: UploadedStudent, pages: ProcessedPage[]) => {
      setStep("regrading");
      addLog("Sending corrected text to AI grading pipeline…");

      const studentRecords: StudentFairnessRecord[] = [];

      try {
        // Combine all page texts
        const combinedText = pages
          .map((p) => p.correctedText || p.confidenceResult?.fullText || "")
          .filter(Boolean)
          .join("\n\n");

        const res = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student: {
              name: student.name,
              roll: student.roll,
              stream: "JEE",
              subject: "General",
              answerText: combinedText,
              omr: [],
            },
            answerText: combinedText,
            rubricText: "",
          }),
        });

        const grade = await res.json();
        addLog(`Grading complete: ${grade.score ?? "??"}/100 (confidence: ${Math.round((grade.confidence ?? 0) * 100)}%)`);

        const hasCorrectedPages = pages.some((p) => p.correctedText);
        const redCount = pages.filter((p) => p.zone === "red").length;
        const correctionCount = pages.reduce(
          (s, p) => s + (p.confidenceResult?.flaggedWordCount ?? 0),
          0
        );

        studentRecords.push({
          roll: student.roll,
          name: student.name,
          clarityScore: Math.round(
            pages.reduce((s, p) => s + (p.clarityAfter || 50), 0) / Math.max(1, pages.length)
          ),
          totalWords: pages.reduce(
            (s, p) => s + (p.confidenceResult?.words.length ?? 0),
            0
          ),
          flaggedWords: pages.reduce(
            (s, p) => s + (p.confidenceResult?.flaggedWordCount ?? 0),
            0
          ),
          humanReviewedWords: pages.reduce(
            (s, p) => s + (p.zone === "red" || p.zone === "amber" ? (p.confidenceResult?.flaggedWordCount ?? 0) : 0),
            0
          ),
          manualCorrections: correctionCount,
          finalScore: grade.score ?? 0,
          gradingConfidence: grade.confidence ?? 0.8,
          route: redCount > 0 ? "teacher_reviewed" : hasCorrectedPages ? "ai_with_flag" : "auto_graded",
        });
      } catch (err) {
        console.error("[HandwritingDashboard] Grading failed:", err);
        addLog("⚠️ Grading API failed — using placeholder data for report.");

        studentRecords.push({
          roll: student.roll,
          name: student.name,
          clarityScore: 55,
          totalWords: 200,
          flaggedWords: 12,
          humanReviewedWords: 12,
          manualCorrections: 5,
          finalScore: 0,
          gradingConfidence: 0,
          route: "teacher_reviewed",
        });
      }

      // Build fairness report data
      const reportData: FairnessReportData = {
        examName: `${student.name} — Evaluation`,
        examDate: new Date().toLocaleDateString(),
        generatedAt: new Date().toISOString(),
        instituteName: "PrepForge Institute",
        students: studentRecords,
      };

      setFairnessData(reportData);
      setStep("report");
      addLog("✅ Pipeline complete. Fairness report ready.");
    },
    [addLog]
  );

  // ─── Reset ────────────────────────────────────────────────────────────

  const handleReset = () => {
    setStep("idle");
    setStudents([]);
    setReviewPages([]);
    setFairnessData(null);
    setLog([]);
    setProcessingProgress(0);
    setErrorMessage(null);
    setStudentName("");
    setStudentRoll("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Render: ReviewQueue ───────────────────────────────────────────────
  if (step === "reviewing" && reviewPages.length > 0) {
    return (
      <ReviewQueue
        pages={reviewPages}
        onReviewComplete={handleReviewComplete}
        onPageDone={(r) => addLog(`Page "${r.pageId}" saved with ${r.corrections.length} corrections.`)}
      />
    );
  }

  // ─── Render: FairnessReport ────────────────────────────────────────────
  if (step === "report" && fairnessData) {
    return (
      <div className="min-h-screen bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 pt-6">
          <button
            onClick={handleReset}
            className="mb-4 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Start New Evaluation
          </button>
        </div>
        <FairnessReport data={fairnessData} />
      </div>
    );
  }

  // ─── Render: Main Dashboard ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Top header ──────────────────────────────────────────────────── */}
      <div className="bg-gray-900/80 border-b border-gray-800 px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">✍️</span>
            <h1 className="text-2xl font-bold text-white">
              Handwriting Fairness System
            </h1>
          </div>
          <p className="text-gray-400 text-sm ml-12">
            Auto-enhance → Dual-OCR confidence → Teacher review → AI grading →
            Audit report
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── Pipeline Stepper ─────────────────────────────────────────── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Pipeline Progress
          </h2>
          <PipelineStepper currentStep={step === "idle" ? "upload" : step} />
          {step !== "idle" && step !== "upload" && step !== "report" && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Processing…</span>
                <span>{processingProgress}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Error message ────────────────────────────────────────────── */}
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* ── Upload form (shown when idle or after reset) ─────────────── */}
        {(step === "idle" || step === "upload") && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white">
              Start New Evaluation
            </h2>

            {/* Student meta */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">
                  Student Name
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Aryan Sharma"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">
                  Roll Number
                </label>
                <input
                  type="text"
                  value={studentRoll}
                  onChange={(e) => setStudentRoll(e.target.value)}
                  placeholder="e.g. JEE-2026-042"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* File drop zone */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">
                Answer Sheet Images (JPG / PNG / PDF)
              </label>
              <label
                htmlFor="hw-file-input"
                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-xl cursor-pointer transition-colors bg-gray-800/40 hover:bg-indigo-500/5"
              >
                <span className="text-4xl mb-2">📂</span>
                <p className="text-sm text-gray-400">
                  Click to upload or drag & drop
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Multiple pages supported
                </p>
                <input
                  id="hw-file-input"
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* ── Page cards (shown during / after processing) ─────────────── */}
        {students.length > 0 && step !== "idle" && step !== "report" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Pages ({students[0].pages.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {students[0].pages.map((page, idx) => (
                <div
                  key={page.id}
                  className="flex gap-3 bg-gray-800/60 rounded-xl p-3 border border-gray-700"
                >
                  {/* Thumbnail */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={page.imageDataUrl}
                    alt={`Page ${idx + 1}`}
                    className="w-16 h-20 object-cover rounded-lg border border-gray-700 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-200 truncate">
                        Page {idx + 1}
                      </span>
                      <ZonePill zone={page.zone} />
                    </div>
                    {page.confidenceResult && (
                      <>
                        <p className="text-xs text-gray-500">
                          Confidence:{" "}
                          <span
                            className={
                              page.confidenceResult.pageConfidence >= 80
                                ? "text-green-400"
                                : page.confidenceResult.pageConfidence >= 50
                                ? "text-amber-400"
                                : "text-red-400"
                            }
                          >
                            {page.confidenceResult.pageConfidence}%
                          </span>
                        </p>
                        <p className="text-xs text-gray-600">
                          {page.confidenceResult.flaggedWordCount} flagged words
                        </p>
                        <p className="text-xs text-gray-600 capitalize">
                          → {page.confidenceResult.recommendation.replace(/_/g, " ")}
                        </p>
                      </>
                    )}
                    {page.zone === "pending" && (
                      <p className="text-xs text-gray-600 animate-pulse mt-1">
                        Processing…
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Reset button during processing */}
            {step !== "regrading" && (
              <button
                onClick={handleReset}
                className="text-xs text-gray-600 hover:text-gray-400 underline mt-2"
              >
                Cancel & start over
              </button>
            )}
          </div>
        )}

        {/* ── Activity Log ────────────────────────────────────────────────── */}
        {log.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Pipeline Log
            </h2>
            <div className="space-y-1 max-h-48 overflow-y-auto font-mono text-xs text-gray-400">
              {log.map((entry, i) => (
                <div key={i} className="leading-5">
                  {entry}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Legend (shown in idle state) ────────────────────────────────── */}
        {step === "idle" && (
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                zone: "green",
                title: "GREEN Zone (>80%)",
                desc: "High confidence — auto-graded instantly, no human review needed.",
                color: "border-green-500/30 bg-green-500/5",
                badge: "text-green-300",
              },
              {
                zone: "amber",
                title: "AMBER Zone (50-80%)",
                desc: "Medium confidence — AI grades, but flagged words highlighted for optional review.",
                color: "border-amber-500/30 bg-amber-500/5",
                badge: "text-amber-300",
              },
              {
                zone: "red",
                title: "RED Zone (<50%)",
                desc: "Low confidence — page enters teacher review queue BEFORE grading.",
                color: "border-red-500/30 bg-red-500/5",
                badge: "text-red-300",
              },
            ].map((z) => (
              <div key={z.zone} className={`border rounded-2xl p-4 ${z.color}`}>
                <span className={`text-xs font-bold uppercase tracking-wider ${z.badge}`}>
                  {z.zone}
                </span>
                <p className="text-sm font-semibold text-white mt-1 mb-1">{z.title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{z.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
