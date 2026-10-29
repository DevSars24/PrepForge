"use client";

import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  FileText,
  Lightbulb,
  Save,
  X,
} from "lucide-react";
import type { EvaluationResult, StepGrade } from "@/lib/evaluation";
import { sanitizeMath } from "@/lib/sanitizeMath";
import { isFalseDeductionError } from "@/lib/gradingGuardrails";
import StudentSummaryAudio from "@/components/StudentSummaryAudio";

interface Props {
  result: EvaluationResult;
  onUpdateResult?: (updated: EvaluationResult) => void;
  evaluationId?: string;
  teacherName?: string;
}

/**
 * Clean and format header string into: "Q1 · Section A · Spherical Surfaces"
 */
function formatQuestionHeader(grade: StepGrade, index: number): {
  qNo: string;
  section: string;
  topic: string;
} {
  // Extract or normalize Q number
  let qNo = grade.question_no || grade.rubricId || `Q${index + 1}`;
  if (!/^Q/i.test(qNo) && /^\d+/.test(qNo)) {
    qNo = `Q${qNo}`;
  }

  // Extract section
  let section = grade.section || "General";
  if (/^sec(?:tion)?\s*a\b/i.test(section)) {
    section = "Section A (MCQ)";
  } else if (/^sec(?:tion)?\s*b\b/i.test(section)) {
    section = "Section B";
  } else if (/^sec(?:tion)?\s*c\b/i.test(section)) {
    section = "Section C";
  } else if (/^sec(?:tion)?\s*d\b/i.test(section)) {
    section = "Section D";
  } else if (/^sec(?:tion)?\s*e\b/i.test(section)) {
    section = "Section E";
  }

  // Extract topic
  let topic = grade.topic || "Academic Question";
  topic = topic
    .replace(/^Short Answer\s*[-–:]\s*/i, "")
    .replace(/^Section\s+[A-Z]\s*[-–:]\s*/i, "")
    .replace(/^MCQ\s*[-–:]\s*/i, "")
    .trim();

  // Shorten topic if it has parentheses e.g. "Modern Physics (Photons)" -> "Photons"
  const parenMatch = topic.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1].length < 24) {
    topic = parenMatch[1];
  }

  return { qNo, section, topic };
}

export default function DescriptiveResultCards({
  result,
  onUpdateResult,
  evaluationId,
  teacherName = "Faculty Teacher",
}: Props) {
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [overrideValue, setOverrideValue] = useState<string>("");
  const [savingOverride, setSavingOverride] = useState(false);
  const [overrideFeedback, setOverrideFeedback] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("ALL");

  const stepGrades = result.stepGrades || [];

  // Toggle reasoning accordion
  const toggleReasoning = (rubricId: string) => {
    setExpandedReasoning((prev) => ({
      ...prev,
      [rubricId]: !prev[rubricId],
    }));
  };

  // Start editing marks
  const startEditing = (grade: StepGrade) => {
    setEditingQuestion(grade.rubricId);
    setOverrideValue(String(grade.awarded));
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingQuestion(null);
    setOverrideValue("");
  };

  // Save manual override marks
  const saveOverride = async (grade: StepGrade) => {
    const newMarks = parseFloat(overrideValue);
    if (isNaN(newMarks) || newMarks < 0 || newMarks > grade.max) {
      alert(`Please enter a valid score between 0 and ${grade.max}.`);
      return;
    }

    setSavingOverride(true);
    const originalMarks = grade.awarded;

    // Clone and update stepGrades
    const updatedStepGrades = stepGrades.map((g) => {
      if (g.rubricId === grade.rubricId) {
        return {
          ...g,
          awarded: newMarks,
          status: (newMarks >= g.max ? "earned" : newMarks > 0 ? "partial" : "review") as
            | "earned"
            | "partial"
            | "review",
          teacher_override: {
            original_marks: originalMarks,
            new_marks: newMarks,
            overridden_at: new Date().toISOString(),
            teacher_name: teacherName,
          },
        };
      }
      return g;
    });

    const newTotalAwarded = updatedStepGrades.reduce((sum, g) => sum + g.awarded, 0);
    const newTotalMax = Math.max(1, updatedStepGrades.reduce((sum, g) => sum + g.max, 0));
    const newScore = Math.round((newTotalAwarded / newTotalMax) * 100);

    // Recompute section scores
    const sectionScores: Record<string, { awarded: number; max: number }> = {};
    for (const sg of updatedStepGrades) {
      const sec = sg.section || "General";
      if (!sectionScores[sec]) sectionScores[sec] = { awarded: 0, max: 0 };
      sectionScores[sec].awarded += sg.awarded;
      sectionScores[sec].max += sg.max;
    }

    const needsReviewCount = updatedStepGrades.filter(
      (g) => g.needs_review || g.status === "review"
    ).length;

    const updatedResult: EvaluationResult = {
      ...result,
      score: newScore,
      stepGrades: updatedStepGrades,
      sectionScores,
      needsReviewCount,
    };

    // Update locally immediately
    if (onUpdateResult) {
      onUpdateResult(updatedResult);
    }

    // Persist to server & log in History Logs
    try {
      await fetch("/api/evaluations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: evaluationId,
          question_no: grade.question_no || grade.rubricId,
          original_marks: originalMarks,
          new_marks: newMarks,
          teacher_name: teacherName,
          updatedResult,
        }),
      });
      setOverrideFeedback(`Score for ${grade.rubricId} updated to ${newMarks}/${grade.max}`);
      setTimeout(() => setOverrideFeedback(null), 3500);
    } catch (err) {
      console.error("Failed to persist override to history log:", err);
    } finally {
      setSavingOverride(false);
      setEditingQuestion(null);
    }
  };

  // Calculate summary metrics
  const totalAwarded = stepGrades.reduce((sum, g) => sum + g.awarded, 0);
  const totalMax = Math.max(1, stepGrades.reduce((sum, g) => sum + g.max, 0));
  const needsReviewCount = stepGrades.filter(
    (g) => g.needs_review || g.status === "review"
  ).length;

  // Group by section for summary bar
  const sectionScores: Record<string, { awarded: number; max: number }> = {};
  if (result.sectionScores && Object.keys(result.sectionScores).length > 0) {
    Object.assign(sectionScores, result.sectionScores);
  } else {
    for (const sg of stepGrades) {
      const sec = sg.section || "General";
      if (!sectionScores[sec]) sectionScores[sec] = { awarded: 0, max: 0 };
      sectionScores[sec].awarded += sg.awarded;
      sectionScores[sec].max += sg.max;
    }
  }

  // Filter questions by section if selected
  const displayedGrades =
    selectedSection === "ALL"
      ? stepGrades
      : stepGrades.filter((g) => {
          const sec = g.section || "General";
          return sec.toLowerCase().includes(selectedSection.toLowerCase());
        });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── TOP SUMMARY BAR ─────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          padding: "16px 20px",
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {/* Total Marks Pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Total Marks:
            </span>
            <span
              style={{
                fontSize: "1.15rem",
                fontWeight: 800,
                color: "#4f46e5",
                background: "#eef2ff",
                padding: "4px 12px",
                borderRadius: "10px",
                border: "1px solid #c7d2fe",
                boxShadow: "0 1px 2px rgba(79, 70, 229, 0.08)",
              }}
            >
              {totalAwarded} / {totalMax}
            </span>
          </div>

          <div
            className="hidden sm:block"
            style={{ height: 24, width: 1, background: "#e2e8f0" }}
          />

          {/* Section Score Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "0.76rem",
                color: "#94a3b8",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Sections:
            </span>
            {Object.entries(sectionScores).map(([sec, scores]) => (
              <button
                key={sec}
                type="button"
                onClick={() => setSelectedSection(selectedSection === sec ? "ALL" : sec)}
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: selectedSection === sec ? "#4f46e5" : "#f1f5f9",
                  color: selectedSection === sec ? "#ffffff" : "#475569",
                  border: `1px solid ${selectedSection === sec ? "#4338ca" : "#e2e8f0"}`,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                title={`Filter by ${sec}`}
              >
                {sec}:{" "}
                <strong style={{ color: selectedSection === sec ? "#ffffff" : "#0f172a" }}>
                  {scores.awarded}/{scores.max}
                </strong>
              </button>
            ))}
          </div>
        </div>

        {/* Review Needed / All Verified Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {selectedSection !== "ALL" && (
            <button
              type="button"
              onClick={() => setSelectedSection("ALL")}
              style={{
                fontSize: "0.76rem",
                fontWeight: 700,
                color: "#6366f1",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Reset Filter
            </button>
          )}

          {needsReviewCount > 0 ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.8rem",
                fontWeight: 700,
                padding: "4px 12px",
                borderRadius: 999,
                background: "#fffbeb",
                color: "#b45309",
                border: "1px solid #fde68a",
              }}
            >
              <AlertCircle size={14} color="#d97706" />
              {needsReviewCount} {needsReviewCount === 1 ? "question needs" : "questions need"} review
            </span>
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.8rem",
                fontWeight: 700,
                padding: "4px 12px",
                borderRadius: 999,
                background: "#ecfdf5",
                color: "#065f46",
                border: "1px solid #a7f3d0",
              }}
            >
              <CheckCircle2 size={14} color="#10b981" />
              All questions verified
            </span>
          )}
        </div>
      </div>

      {overrideFeedback && (
        <div
          style={{
            padding: "10px 16px",
            background: "#ecfdf5",
            color: "#065f46",
            border: "1px solid #a7f3d0",
            borderRadius: "10px",
            fontSize: "0.85rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CheckCircle2 size={16} />
          {overrideFeedback}
        </div>
      )}

      <StudentSummaryAudio result={result} />

      {/* ── QUESTION RESULT CARDS ────────────────────────────────────── */}
      {displayedGrades.map((grade, index) => {
        const { qNo, section, topic } = formatQuestionHeader(grade, index);
        const isFull = grade.awarded >= grade.max && grade.awarded > 0;
        const isPartial = grade.awarded > 0 && grade.awarded < grade.max;
        const isZero = grade.awarded === 0;
        const isReview = Boolean(grade.needs_review || grade.status === "review");

        // Status border accent color
        const borderLeftColor = isFull ? "#10b981" : isPartial ? "#f59e0b" : "#ef4444";

        // Score badge colors
        let scoreBg = "#ecfdf5";
        let scoreColor = "#065f46";
        let scoreBorder = "#a7f3d0";
        if (isPartial) {
          scoreBg = "#fffbeb";
          scoreColor = "#92400e";
          scoreBorder = "#fde68a";
        } else if (isZero) {
          scoreBg = "#fef2f2";
          scoreColor = "#991b1b";
          scoreBorder = "#fecaca";
        }

        // Student wrote content
        const studentWroteText =
          grade.student_final_answer ||
          (grade.citations && grade.citations[0]?.excerpt) ||
          (grade.errors && grade.errors[0]?.student_wrote) ||
          "Formula setup and numerical substitutions provided.";

        // Expected content
        const expectedText =
          grade.expected_final_answer ||
          grade.expected ||
          "Correct analytical derivation and numerical answer.";

        // Rubric breakdown chips
        const rubricBreakdown =
          grade.rubric_breakdown && grade.rubric_breakdown.length > 0
            ? grade.rubric_breakdown
            : [
                {
                  criterion: "Formula & Concepts",
                  awarded: isFull ? grade.max / 2 : Math.min(grade.max / 2, grade.awarded),
                  max: grade.max / 2,
                  met: isFull || grade.awarded >= grade.max / 2,
                },
                {
                  criterion: "Steps & Calculation",
                  awarded: isFull ? grade.max / 2 : Math.max(0, grade.awarded - grade.max / 2),
                  max: grade.max / 2,
                  met: isFull,
                },
              ];

        // Filter out false deduction items where what student wrote actually matches expected!
        const validDeductions = (grade.errors || []).filter(
          (err) => !isFalseDeductionError(err.student_wrote, err.expected)
        );

        const isReasoningOpen = Boolean(expandedReasoning[grade.rubricId]);

        return (
          <div
            key={grade.rubricId}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderLeft: `4px solid ${borderLeftColor}`,
              borderRadius: "14px",
              padding: "20px 22px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03), 0 2px 6px rgba(0,0,0,0.02)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              transition: "box-shadow 0.2s ease, transform 0.2s ease",
            }}
          >
            {/* Header: Q22 · Section C · Kirchhoff's Laws */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 800,
                    color: "#0f172a",
                    background: "#f1f5f9",
                    padding: "3px 10px",
                    borderRadius: "8px",
                  }}
                >
                  {qNo}
                </span>

                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "#475569",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    padding: "3px 10px",
                    borderRadius: 999,
                  }}
                >
                  {section}
                </span>

                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#4f46e5" }}>
                  {topic}
                </span>

                {/* Overridden Badge */}
                {grade.teacher_override && (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "3px 9px",
                      borderRadius: 999,
                      background: "#eef2ff",
                      color: "#4338ca",
                      border: "1px solid #c7d2fe",
                    }}
                  >
                    ✏️ Override: {grade.teacher_override.new_marks}/{grade.max} (was{" "}
                    {grade.teacher_override.original_marks})
                  </span>
                )}
              </div>

              {/* Right Side: Badges & Override Button */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {isReview && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "#fffbeb",
                      color: "#b45309",
                      border: "1px solid #fde68a",
                    }}
                  >
                    Needs review
                  </span>
                )}

                <span
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 800,
                    padding: "4px 14px",
                    borderRadius: 999,
                    background: scoreBg,
                    color: scoreColor,
                    border: `1px solid ${scoreBorder}`,
                  }}
                >
                  {grade.awarded} / {grade.max}
                </span>

                {/* Inline Override Marks Trigger */}
                {editingQuestion === grade.rubricId ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={grade.max}
                      value={overrideValue}
                      onChange={(e) => setOverrideValue(e.target.value)}
                      style={{
                        width: 60,
                        padding: "4px 6px",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        borderRadius: "6px",
                        border: "1.5px solid #4f46e5",
                        textAlign: "center",
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => saveOverride(grade)}
                      disabled={savingOverride}
                      title="Save Override"
                      style={{
                        padding: "5px 10px",
                        background: "#4f46e5",
                        color: "white",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      <Save size={13} />
                      Save
                    </button>
                    <button
                      onClick={cancelEditing}
                      title="Cancel"
                      style={{
                        padding: "4px 6px",
                        background: "transparent",
                        color: "#94a3b8",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEditing(grade)}
                    title="Override marks"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 10px",
                      fontSize: "0.76rem",
                      fontWeight: 600,
                      color: "#475569",
                      background: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Edit3 size={12} />
                    Override
                  </button>
                )}
              </div>
            </div>

            {/* Rubric Breakdown Chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {rubricBreakdown.map((r, rIdx) => {
                const met = Boolean(r.met || r.awarded >= r.max);
                return (
                  <span
                    key={rIdx}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "0.76rem",
                      fontWeight: 600,
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: met ? "#ecfdf5" : "#fef2f2",
                      color: met ? "#065f46" : "#991b1b",
                      border: `1px solid ${met ? "#a7f3d0" : "#fecaca"}`,
                    }}
                  >
                    {met ? "✅" : "❌"} {sanitizeMath(r.criterion)} ({r.awarded}/{r.max})
                  </span>
                );
              })}
            </div>

            {/* Structured Dual Comparison Container (Student vs Expected) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 10,
                background: "#f8fafc",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
              }}
            >
              {/* Student Response */}
              <div
                style={{
                  background: "#ffffff",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  <FileText size={12} color="#6366f1" />
                  Student Response
                </div>
                <div
                  style={{
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: "0.82rem",
                    color: "#0f172a",
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                  }}
                >
                  {sanitizeMath(studentWroteText)}
                </div>
              </div>

              {/* Expected / Rubric Key */}
              <div
                style={{
                  background: "#ffffff",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "#059669",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  <CheckCircle2 size={12} color="#10b981" />
                  Expected Solution
                </div>
                <div
                  style={{
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: "0.82rem",
                    color: "#166534",
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                  }}
                >
                  {sanitizeMath(expectedText)}
                </div>
              </div>
            </div>

            {/* Examiner Feedback */}
            {grade.note && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  fontSize: "0.84rem",
                  color: "#334155",
                  lineHeight: 1.5,
                  padding: "8px 12px",
                  background: "#f1f5f9",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Lightbulb
                  size={15}
                  color="#d97706"
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <div>
                  <strong style={{ color: "#0f172a" }}>Feedback:</strong>{" "}
                  {sanitizeMath(grade.note)}
                </div>
              </div>
            )}

            {/* Deduction Details: ONLY shown when real discrepancies exist! */}
            {!isFull && validDeductions.length > 0 && (
              <div
                style={{
                  background: "#fff1f2",
                  border: "1px solid #fecdd3",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.76rem",
                    fontWeight: 800,
                    color: "#9f1239",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  <AlertTriangle size={14} color="#e11d48" />
                  Deduction Details ({validDeductions.length}{" "}
                  {validDeductions.length === 1 ? "Discrepancy" : "Discrepancies"})
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {validDeductions.map((err, errIdx) => (
                    <div
                      key={errIdx}
                      style={{
                        background: "#ffffff",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #ffe4e6",
                        fontSize: "0.8rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontWeight: 700, color: "#881337" }}>
                          Step ({sanitizeMath(err.step)})
                        </span>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 999,
                            background: "#ffe4e6",
                            color: "#be123c",
                          }}
                        >
                          Deviation
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                          fontSize: "0.78rem",
                          lineHeight: 1.4,
                        }}
                      >
                        <span style={{ color: "#be123c" }}>
                          Student wrote: &ldquo;{sanitizeMath(err.student_wrote)}&rdquo;
                        </span>
                        <br />
                        <span style={{ color: "#047857" }}>
                          Expected: &ldquo;{sanitizeMath(err.expected)}&rdquo;
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chain-of-Thought Reasoning Accordion */}
            {grade.reasoning && (
              <div style={{ marginTop: 2 }}>
                <button
                  type="button"
                  onClick={() => toggleReasoning(grade.rubricId)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "transparent",
                    border: "none",
                    color: "#4f46e5",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    padding: 0,
                  }}
                >
                  {isReasoningOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {isReasoningOpen ? "Hide full reasoning" : "View full reasoning"}
                </button>

                {isReasoningOpen && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "12px 16px",
                      background: "#f8fafc",
                      borderLeft: "3px solid #6366f1",
                      borderRadius: "0 10px 10px 0",
                      fontSize: "0.83rem",
                      color: "#334155",
                      lineHeight: 1.6,
                    }}
                  >
                    <p style={{ margin: 0 }}>{sanitizeMath(grade.reasoning)}</p>

                    {grade.citations && grade.citations.length > 0 && (
                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            color: "#64748b",
                            textTransform: "uppercase",
                          }}
                        >
                          Semantic Citations:
                        </span>
                        {grade.citations.map((c, cIdx) => (
                          <div
                            key={cIdx}
                            style={{
                              fontSize: "0.78rem",
                              fontStyle: "italic",
                              color: "#475569",
                              paddingLeft: 8,
                              borderLeft: "2px solid #cbd5e1",
                            }}
                          >
                            &ldquo;{sanitizeMath(c.excerpt)}&rdquo; &mdash; {c.source} (line{" "}
                            {c.line})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {result.aiText && (
        <div
          style={{
            background: "#eef2ff",
            border: "1px solid #c7d2fe",
            borderRadius: "14px",
            padding: 18,
            fontSize: "0.88rem",
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "#312e81" }}>Faculty Feedback Summary:</strong>
          <p style={{ marginTop: 4, color: "#3730a3" }}>{sanitizeMath(result.aiText)}</p>
        </div>
      )}

      {result.warning && (
        <div className="warning-banner" style={{ margin: 0 }}>
          {result.warning}
        </div>
      )}
    </div>
  );
}
