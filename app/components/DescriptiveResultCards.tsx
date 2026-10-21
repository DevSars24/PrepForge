"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  X,
} from "lucide-react";
import type { EvaluationResult, StepGrade } from "@/lib/evaluation";
import { sanitizeMath } from "@/lib/sanitizeMath";

interface Props {
  result: EvaluationResult;
  onUpdateResult?: (updated: EvaluationResult) => void;
  evaluationId?: string;
  teacherName?: string;
}

/**
 * Clean and format header string into: "Q20 · Short Answer · Photons"
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
  let section = grade.section || "Short Answer";
  if (section.toLowerCase().includes("section b")) {
    section = "Short Answer";
  }

  // Extract topic
  let topic = grade.topic || "Physics";
  topic = topic
    .replace(/^Short Answer\s*[-–:]\s*/i, "")
    .replace(/^Section\s+[A-Z]\s*[-–:]\s*/i, "")
    .trim();

  // Shorten topic if it has parentheses e.g. "Modern Physics (Photons)" -> "Photons"
  const parenMatch = topic.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1].length < 20) {
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
          status: (newMarks >= g.max ? "earned" : newMarks > 0 ? "partial" : "review") as "earned" | "partial" | "review",
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
      const sec = sg.section || "Section B";
      if (!sectionScores[sec]) sectionScores[sec] = { awarded: 0, max: 0 };
      sectionScores[sec].awarded += sg.awarded;
      sectionScores[sec].max += sg.max;
    }

    const needsReviewCount = updatedStepGrades.filter((g) => g.needs_review || g.status === "review").length;

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
  const needsReviewCount = stepGrades.filter((g) => g.needs_review || g.status === "review").length;

  // Group by section for summary bar
  const sectionScores: Record<string, { awarded: number; max: number }> = {};
  if (result.sectionScores && Object.keys(result.sectionScores).length > 0) {
    Object.assign(sectionScores, result.sectionScores);
  } else {
    for (const sg of stepGrades) {
      const sec = sg.section || "Section B";
      if (!sectionScores[sec]) sectionScores[sec] = { awarded: 0, max: 0 };
      sectionScores[sec].awarded += sg.awarded;
      sectionScores[sec].max += sg.max;
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── TOP SUMMARY BAR ─────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "14px 18px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
              Total Marks:
            </span>
            <span
              style={{
                fontSize: "1.1rem",
                fontWeight: 800,
                color: "var(--accent)",
                background: "var(--accent-soft)",
                padding: "2px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-accent)",
              }}
            >
              {totalAwarded} / {totalMax}
            </span>
          </div>

          <div className="hidden sm:block" style={{ height: 20, width: 1, background: "var(--border)" }} />

          {/* Section-wise scores */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-tertiary)", fontWeight: 600 }}>
              Sections:
            </span>
            {Object.entries(sectionScores).map(([sec, scores]) => (
              <span
                key={sec}
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                {sec}: <strong style={{ color: "var(--text-primary)" }}>{scores.awarded}/{scores.max}</strong>
              </span>
            ))}
          </div>
        </div>

        {/* Review needed count badge */}
        <div>
          {needsReviewCount > 0 ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.8rem",
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 999,
                background: "#f1f5f9",
                color: "#475569",
                border: "1px solid #cbd5e1",
              }}
            >
              <AlertCircle size={14} color="#64748b" />
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
                padding: "4px 10px",
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
            padding: "8px 14px",
            background: "#ecfdf5",
            color: "#065f46",
            border: "1px solid #a7f3d0",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          ✅ {overrideFeedback}
        </div>
      )}

      {/* ── QUESTION RESULT CARDS ────────────────────────────────────── */}
      {stepGrades.map((grade, index) => {
        const { qNo, section, topic } = formatQuestionHeader(grade, index);
        const isFull = grade.awarded >= grade.max && grade.awarded > 0;
        const isPartial = grade.awarded > 0 && grade.awarded < grade.max;
        const isZero = grade.awarded === 0;
        const isReview = Boolean(grade.needs_review || grade.status === "review");

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

        const isReasoningOpen = Boolean(expandedReasoning[grade.rubricId]);

        return (
          <div
            key={grade.rubricId}
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "18px 20px",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              transition: "border-color 0.2s ease",
            }}
          >
            {/* Header: Q20 · Short Answer · Photons */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  {qNo}
                </span>
                <span style={{ color: "var(--text-tertiary)" }}>·</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  {section}
                </span>
                <span style={{ color: "var(--text-tertiary)" }}>·</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent)" }}>
                  {topic}
                </span>

                {/* Overridden Badge */}
                {grade.teacher_override && (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "var(--accent-soft)",
                      color: "var(--accent)",
                      border: "1px solid var(--border-accent)",
                    }}
                  >
                    ✏️ Override: {grade.teacher_override.new_marks}/{grade.max} (was {grade.teacher_override.original_marks})
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
                      padding: "3px 8px",
                      borderRadius: 999,
                      background: "#f1f5f9",
                      color: "#475569",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    Review needed
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
                        padding: "3px 6px",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--accent)",
                        textAlign: "center",
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => saveOverride(grade)}
                      disabled={savingOverride}
                      title="Save Override"
                      style={{
                        padding: "4px 8px",
                        background: "var(--accent)",
                        color: "white",
                        borderRadius: "var(--radius-sm)",
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
                        color: "var(--text-tertiary)",
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
                      padding: "4px 8px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                    }}
                  >
                    <Edit3 size={12} />
                    Override
                  </button>
                )}
              </div>
            </div>

            {/* Rubric chips row: Formula / Steps / Answer+Unit with ✅/❌ and marks */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {rubricBreakdown.map((r, rIdx) => {
                const met = Boolean(r.met || r.awarded >= r.max);
                return (
                  <span
                    key={rIdx}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: "0.75rem",
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

            {/* Two compact rows: "Student wrote" and "Expected" (monospace) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 6,
                background: "var(--bg-surface)",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 text-[0.82rem]">
                <span className="font-bold text-[var(--text-tertiary)] shrink-0 sm:min-w-[95px]">
                  Student wrote:
                </span>
                <span
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    color: "var(--text-primary)",
                    wordBreak: "break-word",
                  }}
                >
                  {sanitizeMath(studentWroteText)}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 text-[0.82rem]">
                <span className="font-bold text-[var(--text-tertiary)] shrink-0 sm:min-w-[95px]">
                  Expected:
                </span>
                <span
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    color: "var(--text-secondary)",
                    wordBreak: "break-word",
                  }}
                >
                  {sanitizeMath(expectedText)}
                </span>
              </div>
            </div>

            {/* One-line feedback */}
            {grade.note && (
              <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
                💡 <strong>Feedback:</strong> {sanitizeMath(grade.note)}
              </p>
            )}

            {/* Errors block (ONLY when marks were deducted) */}
            {!isFull && grade.errors && grade.errors.length > 0 && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 12px",
                  fontSize: "0.8rem",
                  color: "#991b1b",
                }}
              >
                <strong style={{ display: "block", marginBottom: 4 }}>Deduction Details:</strong>
                {grade.errors.map((err, errIdx) => (
                  <div key={errIdx} style={{ marginBottom: 4 }}>
                    • <strong>Step ({err.step}):</strong> Student wrote &ldquo;{sanitizeMath(err.student_wrote)}&rdquo; (Expected: &ldquo;{sanitizeMath(err.expected)}&rdquo;)
                  </div>
                ))}
              </div>
            )}

            {/* Collapsed "View full reasoning" accordion */}
            {grade.reasoning && (
              <div style={{ marginTop: 2 }}>
                <button
                  onClick={() => toggleReasoning(grade.rubricId)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "transparent",
                    border: "none",
                    color: "var(--accent)",
                    cursor: "pointer",
                    fontSize: "0.78rem",
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
                      padding: "10px 14px",
                      background: "var(--bg-surface)",
                      borderLeft: "3px solid var(--accent)",
                      borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
                      fontSize: "0.82rem",
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                    }}
                  >
                    <p style={{ margin: 0 }}>{sanitizeMath(grade.reasoning)}</p>

                    {grade.citations && grade.citations.length > 0 && (
                      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-tertiary)" }}>
                          Grounded Citations:
                        </span>
                        {grade.citations.map((c, cIdx) => (
                          <div
                            key={cIdx}
                            style={{
                              fontSize: "0.78rem",
                              fontStyle: "italic",
                              color: "var(--text-secondary)",
                              paddingLeft: 8,
                              borderLeft: "2px solid var(--border)",
                            }}
                          >
                            &ldquo;{sanitizeMath(c.excerpt)}&rdquo; &mdash; {c.source} (line {c.line})
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
            background: "var(--accent-soft)",
            border: "1px solid var(--border-accent)",
            borderRadius: "var(--radius-md)",
            padding: 16,
            fontSize: "0.88rem",
            lineHeight: 1.6,
          }}
        >
          <strong>Faculty Feedback Summary:</strong>
          <p style={{ marginTop: 4, color: "var(--text-secondary)" }}>{sanitizeMath(result.aiText)}</p>
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
