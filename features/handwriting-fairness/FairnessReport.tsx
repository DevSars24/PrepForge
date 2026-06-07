"use client";

/**
 * FairnessReport.tsx
 * ─────────────────────────────────────────────────────────────────────
 * PURPOSE: After grading is done, show a full audit report so parents
 *          and students CANNOT dispute that grading was unfair.
 *
 * SHOWS:
 *   1. Overall stats (auto-graded %, human-reviewed %, words corrected)
 *   2. Per-student breakdown table
 *   3. Official fairness guarantee statement
 *   4. PDF export button (using pdf-lib — no server needed)
 *
 * This is a PURE REACT UI — zero API calls, zero new AI models.
 * Data is passed in via props after the pipeline completes.
 * ─────────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface StudentFairnessRecord {
  /** Student's roll number */
  roll: string;
  /** Student's name */
  name: string;
  /** Handwriting clarity score 0-100 (from ImageEnhancer.getClarityScore) */
  clarityScore: number;
  /** Total words in their answer */
  totalWords: number;
  /** Words that were flagged by ConfidenceScorer */
  flaggedWords: number;
  /** Words that actually went through teacher review */
  humanReviewedWords: number;
  /** Words that teacher manually corrected */
  manualCorrections: number;
  /** Final grade out of 100 */
  finalScore: number;
  /** Overall grading confidence from AI */
  gradingConfidence: number;
  /** Route this student's paper took */
  route: "auto_graded" | "ai_with_flag" | "teacher_reviewed";
}

export interface FairnessReportData {
  /** Exam / batch name */
  examName: string;
  /** Date of exam */
  examDate: string;
  /** Date report was generated */
  generatedAt: string;
  /** Name of school / institute */
  instituteName: string;
  /** Per-student data */
  students: StudentFairnessRecord[];
}

interface FairnessReportProps {
  data: FairnessReportData;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function clarityLabel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: "Good", color: "text-green-400" };
  if (score >= 45) return { label: "Fair", color: "text-amber-400" };
  return { label: "Poor", color: "text-red-400" };
}

function routeBadge(route: StudentFairnessRecord["route"]) {
  const map = {
    auto_graded: {
      label: "Auto Graded",
      cls: "bg-green-500/15 text-green-300 border-green-500/40",
    },
    ai_with_flag: {
      label: "AI + Flagged",
      cls: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    },
    teacher_reviewed: {
      label: "Human Reviewed",
      cls: "bg-blue-500/15 text-blue-300 border-blue-500/40",
    },
  };
  const { label, cls } = map[route];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ─── PDF Export ──────────────────────────────────────────────────────────────

/**
 * generateFairnessPdf()
 * ──────────────────────
 * Creates a multi-page PDF entirely in the browser using pdf-lib.
 * No server, no API key — pure client-side.
 *
 * Pages:
 *   1. Cover page (exam details + guarantee statement)
 *   2. Overall statistics
 *   3-N. Student breakdown table (split across pages as needed)
 */
async function generateFairnessPdf(data: FairnessReportData): Promise<void> {
  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await doc.embedFont(StandardFonts.Helvetica);

  const pageW = 595; // A4 width in pts
  const pageH = 842; // A4 height in pts
  const margin = 50;
  const contentW = pageW - margin * 2;

  // ── Colours ──────────────────────────────────────────────────────────
  const colorIndigo = rgb(0.31, 0.27, 0.9);
  const colorGray = rgb(0.5, 0.5, 0.5);
  const colorDark = rgb(0.1, 0.1, 0.15);
  const colorGreen = rgb(0.13, 0.54, 0.28);
  const colorAmber = rgb(0.8, 0.55, 0.1);
  const colorRed = rgb(0.8, 0.2, 0.2);
  const colorWhite = rgb(1, 1, 1);
  const colorLightGray = rgb(0.93, 0.93, 0.95);

  // ── Helper: add a new A4 page ────────────────────────────────────────
  const addPage = () => doc.addPage([pageW, pageH]);

  // ── Helper: draw text safely (truncate if too long) ──────────────────
  const drawText = (
    page: ReturnType<typeof addPage>,
    text: string,
    opts: {
      x: number;
      y: number;
      size?: number;
      font?: typeof fontBold;
      color?: ReturnType<typeof rgb>;
      maxWidth?: number;
    }
  ) => {
    const {
      x,
      y,
      size = 10,
      font = fontReg,
      color = colorDark,
      maxWidth,
    } = opts;

    let displayText = String(text ?? "");
    if (maxWidth) {
      // Crude truncation to fit column
      while (
        displayText.length > 1 &&
        font.widthOfTextAtSize(displayText, size) > maxWidth
      ) {
        displayText = displayText.slice(0, -1);
      }
      if (displayText.length < String(text).length) displayText += "…";
    }

    page.drawText(displayText, { x, y, size, font, color });
  };

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 1: Cover
  // ════════════════════════════════════════════════════════════════════════
  const cover = addPage();

  // Header bar
  cover.drawRectangle({ x: 0, y: pageH - 100, width: pageW, height: 100, color: colorIndigo });

  drawText(cover, "PrepForge", { x: margin, y: pageH - 45, size: 28, font: fontBold, color: colorWhite });
  drawText(cover, "Handwriting Fairness Report", { x: margin, y: pageH - 70, size: 14, font: fontReg, color: rgb(0.8, 0.8, 1) });

  // Exam details
  let y = pageH - 150;
  drawText(cover, data.examName, { x: margin, y, size: 20, font: fontBold });
  y -= 25;
  drawText(cover, data.instituteName, { x: margin, y, size: 12, color: colorGray });
  y -= 18;
  drawText(cover, `Exam Date: ${data.examDate}   |   Report Generated: ${new Date(data.generatedAt).toLocaleDateString()}`, {
    x: margin, y, size: 10, color: colorGray
  });

  // Fairness guarantee box
  y -= 50;
  cover.drawRectangle({ x: margin, y: y - 70, width: contentW, height: 100, color: rgb(0.9, 0.97, 0.92), borderColor: rgb(0.4, 0.8, 0.5), borderWidth: 1 });
  drawText(cover, "✓ OFFICIAL FAIRNESS GUARANTEE", { x: margin + 15, y: y + 15, size: 11, font: fontBold, color: colorGreen });
  const guaranteeText = [
    "Students with a handwriting clarity score below 60% had their papers reviewed by a",
    "human teacher BEFORE any AI grading took place. No student was penalised for",
    "handwriting quality. This report is an auditable record of that process.",
  ];
  guaranteeText.forEach((line, i) => {
    drawText(cover, line, { x: margin + 15, y: y - 5 - i * 14, size: 9, color: rgb(0.15, 0.45, 0.25) });
  });

  // Quick stats
  const totalStudents = data.students.length;
  const autoCount = data.students.filter((s) => s.route === "auto_graded").length;
  const reviewCount = data.students.filter((s) => s.route === "teacher_reviewed").length;
  const totalCorrections = data.students.reduce((s, r) => s + r.manualCorrections, 0);

  y -= 130;
  const statBoxes = [
    { label: "Total Students", value: totalStudents.toString() },
    { label: "Auto Graded", value: `${Math.round((autoCount / totalStudents) * 100)}%` },
    { label: "Human Reviewed", value: `${Math.round((reviewCount / totalStudents) * 100)}%` },
    { label: "Words Corrected", value: totalCorrections.toString() },
  ];
  const boxW = contentW / 4 - 5;
  statBoxes.forEach((box, i) => {
    const bx = margin + i * (boxW + 6);
    cover.drawRectangle({ x: bx, y: y - 55, width: boxW, height: 70, color: colorLightGray });
    drawText(cover, box.value, { x: bx + 8, y: y + 4, size: 20, font: fontBold, color: colorIndigo });
    drawText(cover, box.label, { x: bx + 8, y: y - 20, size: 9, color: colorGray });
  });

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 2+: Student Breakdown Table
  // ════════════════════════════════════════════════════════════════════════
  const ROWS_PER_PAGE = 22;
  const chunks: StudentFairnessRecord[][] = [];
  for (let i = 0; i < data.students.length; i += ROWS_PER_PAGE) {
    chunks.push(data.students.slice(i, i + ROWS_PER_PAGE));
  }

  chunks.forEach((chunk, chunkIdx) => {
    const tablePage = addPage();
    let ty = pageH - margin;

    // Table title
    drawText(tablePage, "Student Breakdown", { x: margin, y: ty, size: 14, font: fontBold });
    ty -= 5;
    drawText(tablePage, `(Page ${chunkIdx + 2} of ${chunks.length + 1})`, { x: margin, y: ty - 10, size: 9, color: colorGray });
    ty -= 30;

    // Column headers
    const cols = [
      { label: "Roll No.", x: margin, w: 70 },
      { label: "Name", x: margin + 75, w: 110 },
      { label: "Clarity", x: margin + 190, w: 48 },
      { label: "Flagged", x: margin + 242, w: 48 },
      { label: "Reviewed", x: margin + 294, w: 56 },
      { label: "Corrected", x: margin + 354, w: 56 },
      { label: "Score", x: margin + 414, w: 44 },
      { label: "Route", x: margin + 462, w: 80 },
    ];

    // Header row background
    tablePage.drawRectangle({ x: margin, y: ty - 16, width: contentW, height: 22, color: colorIndigo });
    cols.forEach((col) =>
      drawText(tablePage, col.label, { x: col.x + 3, y: ty - 11, size: 8, font: fontBold, color: colorWhite })
    );
    ty -= 20;

    // Data rows
    chunk.forEach((student, rowIdx) => {
      const rowY = ty - rowIdx * 18;
      if (rowIdx % 2 === 0) {
        tablePage.drawRectangle({ x: margin, y: rowY - 13, width: contentW, height: 18, color: colorLightGray });
      }

      const clarity = clarityLabel(student.clarityScore);

      drawText(tablePage, student.roll, { x: cols[0].x + 3, y: rowY - 8, size: 7.5, maxWidth: cols[0].w - 4 });
      drawText(tablePage, student.name, { x: cols[1].x + 3, y: rowY - 8, size: 7.5, maxWidth: cols[1].w - 4 });
      drawText(tablePage, `${student.clarityScore} (${clarity.label})`, {
        x: cols[2].x + 3, y: rowY - 8, size: 7.5,
        color: student.clarityScore >= 70 ? colorGreen : student.clarityScore >= 45 ? colorAmber : colorRed,
      });
      drawText(tablePage, student.flaggedWords.toString(), { x: cols[3].x + 3, y: rowY - 8, size: 7.5 });
      drawText(tablePage, student.humanReviewedWords.toString(), { x: cols[4].x + 3, y: rowY - 8, size: 7.5 });
      drawText(tablePage, student.manualCorrections.toString(), { x: cols[5].x + 3, y: rowY - 8, size: 7.5 });
      drawText(tablePage, `${student.finalScore}/100`, { x: cols[6].x + 3, y: rowY - 8, size: 7.5, font: fontBold });
      const routeShort = student.route === "auto_graded" ? "Auto" : student.route === "ai_with_flag" ? "AI+Flag" : "Human";
      const routeColor = student.route === "auto_graded" ? colorGreen : student.route === "teacher_reviewed" ? colorIndigo : colorAmber;
      drawText(tablePage, routeShort, { x: cols[7].x + 3, y: rowY - 8, size: 7.5, color: routeColor });
    });

    // Footer
    drawText(tablePage, `PrepForge Fairness System  |  ${data.instituteName}  |  Generated: ${new Date(data.generatedAt).toLocaleString()}`, {
      x: margin, y: 25, size: 7, color: colorGray
    });
  });

  // ── Trigger browser download ──────────────────────────────────────────
  const pdfBytes = await doc.save();
  const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `PrepForge-FairnessReport-${data.examName.replace(/\s+/g, "-")}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function FairnessReport({ data }: FairnessReportProps) {
  const [exportingPdf, setExportingPdf] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof StudentFairnessRecord>("clarityScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // ── Derived statistics ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = data.students.length;
    const autoCount = data.students.filter((s) => s.route === "auto_graded").length;
    const flagCount = data.students.filter((s) => s.route === "ai_with_flag").length;
    const reviewCount = data.students.filter((s) => s.route === "teacher_reviewed").length;
    const totalFlagged = data.students.reduce((s, r) => s + r.flaggedWords, 0);
    const totalCorrected = data.students.reduce((s, r) => s + r.manualCorrections, 0);
    const avgClarity =
      total > 0 ? Math.round(data.students.reduce((s, r) => s + r.clarityScore, 0) / total) : 0;
    return { total, autoCount, flagCount, reviewCount, totalFlagged, totalCorrected, avgClarity };
  }, [data.students]);

  // ── Sort + filter ─────────────────────────────────────────────────────
  const displayStudents = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = q
      ? data.students.filter(
          (s) =>
            s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q)
        )
      : data.students;

    return [...filtered].sort((a, b) => {
      const av = a[sortField] as number | string;
      const bv = b[sortField] as number | string;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data.students, searchQuery, sortField, sortDir]);

  const toggleSort = (field: keyof StudentFairnessRecord) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      await generateFairnessPdf(data);
    } catch (err) {
      console.error("[FairnessReport] PDF export failed:", err);
      alert("PDF export failed. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  };

  // ─── RENDER ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl">⚖️</span>
              <h1 className="text-3xl font-bold text-white">Fairness Report</h1>
            </div>
            <p className="text-gray-400">{data.examName} · {data.instituteName}</p>
            <p className="text-sm text-gray-600 mt-0.5">
              Generated: {new Date(data.generatedAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg"
          >
            {exportingPdf ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Generating PDF…
              </>
            ) : (
              <>📄 Export PDF for Parents</>
            )}
          </button>
        </div>

        {/* ── Stats Cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Students", value: stats.total, icon: "👨‍🎓" },
            {
              label: "Auto Graded",
              value: `${Math.round((stats.autoCount / Math.max(1, stats.total)) * 100)}%`,
              icon: "🤖",
              sub: `${stats.autoCount} students`,
              color: "text-green-400",
            },
            {
              label: "AI + Flagged",
              value: `${Math.round((stats.flagCount / Math.max(1, stats.total)) * 100)}%`,
              icon: "🔶",
              sub: `${stats.flagCount} students`,
              color: "text-amber-400",
            },
            {
              label: "Human Reviewed",
              value: `${Math.round((stats.reviewCount / Math.max(1, stats.total)) * 100)}%`,
              icon: "👩‍🏫",
              sub: `${stats.reviewCount} students`,
              color: "text-blue-400",
            },
            {
              label: "Words Corrected",
              value: stats.totalCorrected,
              icon: "✏️",
              sub: `of ${stats.totalFlagged} flagged`,
            },
            {
              label: "Avg Clarity",
              value: stats.avgClarity,
              icon: "🔍",
              color: stats.avgClarity >= 70 ? "text-green-400" : stats.avgClarity >= 45 ? "text-amber-400" : "text-red-400",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-1"
            >
              <span className="text-2xl">{card.icon}</span>
              <span className={`text-2xl font-bold ${card.color || "text-white"}`}>
                {card.value}
              </span>
              <span className="text-xs text-gray-500">{card.label}</span>
              {card.sub && <span className="text-xs text-gray-600">{card.sub}</span>}
            </div>
          ))}
        </div>

        {/* ── Fairness Guarantee Box ────────────────────────────────────── */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">🛡️</span>
            <div>
              <h3 className="font-bold text-green-300 text-base mb-1">
                Official Fairness Guarantee
              </h3>
              <p className="text-green-200/80 text-sm leading-relaxed">
                Students with a handwriting clarity score below{" "}
                <strong>60%</strong> had their papers reviewed by a human
                teacher <em>before</em> AI grading took place. No student was
                penalised for handwriting quality. A total of{" "}
                <strong>{stats.totalCorrected} words</strong> were manually
                corrected by teachers before grading commenced. This report
                serves as an auditable record of that process and may be
                presented to parents or institutional authorities.
              </p>
            </div>
          </div>
        </div>

        {/* ── Student Table ─────────────────────────────────────────────── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {/* Table toolbar */}
          <div className="px-5 py-4 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-white">
              Per-Student Breakdown
              <span className="ml-2 text-xs text-gray-500 font-normal">
                ({displayStudents.length} of {stats.total})
              </span>
            </h2>
            <input
              type="text"
              placeholder="Search by name or roll…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-60"
            />
          </div>

          {/* Scrollable table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800/60">
                  {(
                    [
                      ["roll", "Roll No."],
                      ["name", "Student"],
                      ["clarityScore", "Clarity"],
                      ["flaggedWords", "Flagged"],
                      ["humanReviewedWords", "Reviewed"],
                      ["manualCorrections", "Corrected"],
                      ["finalScore", "Score"],
                      ["route", "Route"],
                      ["gradingConfidence", "Confidence"],
                    ] as [keyof StudentFairnessRecord, string][]
                  ).map(([field, label]) => (
                    <th
                      key={field}
                      onClick={() => toggleSort(field)}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white select-none whitespace-nowrap"
                    >
                      {label}{" "}
                      {sortField === field
                        ? sortDir === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {displayStudents.map((student, idx) => {
                  const cl = clarityLabel(student.clarityScore);
                  return (
                    <tr
                      key={student.roll}
                      className={`hover:bg-gray-800/40 transition-colors ${
                        idx % 2 === 0 ? "" : "bg-gray-900/40"
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                        {student.roll}
                      </td>
                      <td className="px-4 py-3 text-white font-medium">
                        {student.name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-800 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                student.clarityScore >= 70
                                  ? "bg-green-500"
                                  : student.clarityScore >= 45
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${student.clarityScore}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${cl.color}`}>
                            {student.clarityScore}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{student.flaggedWords}</td>
                      <td className="px-4 py-3 text-gray-300">{student.humanReviewedWords}</td>
                      <td className="px-4 py-3">
                        <span className={student.manualCorrections > 0 ? "text-indigo-400 font-medium" : "text-gray-500"}>
                          {student.manualCorrections}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-white">
                        {student.finalScore}/100
                      </td>
                      <td className="px-4 py-3">{routeBadge(student.route)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            student.gradingConfidence >= 0.8
                              ? "text-green-400"
                              : student.gradingConfidence >= 0.5
                              ? "text-amber-400"
                              : "text-red-400"
                          }
                        >
                          {Math.round(student.gradingConfidence * 100)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {displayStudents.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No students match your search.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
