"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Brain,
  Download,
  FileBadge,
  FileText,
  History,
  Loader2,
  MessageSquareText,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  Trash2,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import {
  answerKey,
  evaluateCustomOmr,
  evaluateLocally,
  type CustomOmrResult,
  type EvaluationResult,
  type Student,
  type Stream,
  type UploadedFile,
} from "@/lib/evaluation";
import type { DebugError } from "@/lib/debug";
import Navbar from "@/components/Navbar";
import gsap from "gsap";

type Workspace = "descriptive" | "omr" | "insights" | "report" | "history";
type ApiPayload<T> = T & { warning?: string; error?: string; debug?: DebugError };
type HistoryRecord = {
  id: string;
  type: "descriptive" | "omr";
  title: string;
  subtitle: string;
  score: number;
  total: number;
  createdAt: string;
  resultJson: Record<string, unknown>;
};

const criteriaText = `Step marking criteria:
1. Award marks only when the student's written step matches a rubric point.
2. Give partial credit for correct formula, method, units, or NCERT terminology.
3. Flag weak evidence for faculty review instead of inventing marks.
4. Attach every mark to a source citation and answer-line evidence.`;

export default function EvaluatePage() {
  const { user } = useUser();
  const [workspace, setWorkspace] = useState<Workspace>("descriptive");
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Dynamic Student details states
  const [studentName, setStudentName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [batch, setBatch] = useState("");
  const [section, setSection] = useState("");
  const [subject, setSubject] = useState("");
  const [stream, setStream] = useState<Stream>("JEE");
  const [examType, setExamType] = useState("");

  // Input fields for evaluations
  const [answerText, setAnswerText] = useState("");
  const [markingCriteria, setMarkingCriteria] = useState(criteriaText);
  const [omrKeyText, setOmrKeyText] = useState(answerKey.join(" "));
  const [omrResponseText, setOmrResponseText] = useState("");

  // File uploads
  const [answerFiles, setAnswerFiles] = useState<UploadedFile[]>([]);
  const [criteriaFiles, setCriteriaFiles] = useState<UploadedFile[]>([]);
  const [omrFiles, setOmrFiles] = useState<UploadedFile[]>([]);
  const [answerFileRefs, setAnswerFileRefs] = useState<File[]>([]);
  const [criteriaFileRefs, setCriteriaFileRefs] = useState<File[]>([]);
  const [omrFileRefs, setOmrFileRefs] = useState<File[]>([]);

  // Results & UI status
  const [loading, setLoading] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [debugError, setDebugError] = useState<DebugError | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Initialize scores locally using form details
  const [result, setResult] = useState<EvaluationResult>(() => {
    const defaultStudent: Student = {
      name: "",
      roll: "",
      stream: "JEE",
      subject: "",
      answerText: "",
      omr: [],
      batch: "",
      section: "",
      examType: "",
    };
    return evaluateLocally(defaultStudent);
  });

  const [omrResult, setOmrResult] = useState<CustomOmrResult>(() =>
    evaluateCustomOmr("A B C D B A C D A B", "")
  );

  // Fetch History Log
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/evaluations");
      if (res.ok) {
        const data = (await res.json()) as { records?: HistoryRecord[]; error?: string; debug?: DebugError };
        setHistoryItems(data.records || []);
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string; debug?: DebugError };
        setDebugError(data.debug || null);
        setStatusNote(data.error || `History fetch failed with status ${res.status}.`);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
      setStatusNote(formatClientError("History fetch failed", error));
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (workspace === "history") {
      fetchHistory();
    }
    // Fade in transition on workspace change
    gsap.fromTo(
      ".workspace-content",
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
    );
  }, [workspace]);



  // Run descriptive answer evaluation
  const runDescriptive = async () => {
    if (!studentName.trim() || !rollNumber.trim()) {
      setStatusNote("Please enter Student Name and Roll Number first.");
      return;
    }

    setLoading(true);
    setStatusNote(null);
    setDebugError(null);

    const currentStudent: Student = {
      name: studentName.trim(),
      roll: rollNumber.trim(),
      stream: stream,
      subject: subject.trim(),
      answerText: answerText,
      omr: omrResponseText ? omrResponseText.trim().split(/\s+/) : [],
      batch: batch.trim() || undefined,
      examType: examType.trim() || undefined,
      section: section.trim() || undefined,
    };

    try {
      // Immediate local result check as fallback/first glance
      const local = evaluateLocally(currentStudent, `${answerText}\n${markingCriteria}`);
      setResult(local);

      const form = new FormData();
      form.append("student", JSON.stringify(currentStudent));
      form.append("answerText", answerText);
      form.append("rubricText", markingCriteria);
      answerFileRefs.forEach((file) => form.append("answerFiles", file));
      criteriaFileRefs.forEach((file) => form.append("criteriaFiles", file));

      const res = await fetch("/api/evaluate", { method: "POST", body: form });
      const data = (await res.json()) as ApiPayload<EvaluationResult>;
      if (!res.ok) {
        setDebugError(data.debug || null);
        setStatusNote(data.error || `Evaluation failed with status ${res.status}. Showing local fallback.`);
        return;
      }
      setResult(data);
      if (data.debug) setDebugError(data.debug);
      if (data.warning) setStatusNote(data.warning);
      else if (answerFileRefs.length) setStatusNote("Answer sheet processed with Gemini Vision OCR + AI grading.");
      else setStatusNote("AI grading complete (Gemini).");
      fetchHistory();
      setWorkspace("insights");
    } catch (err: unknown) {
      console.error(err);
      setStatusNote(formatClientError("Network request failed. Loaded local grading metrics instead", err));
    } finally {
      setLoading(false);
    }
  };

  // Run OMR check evaluation
  const runOmr = async () => {
    if (!omrKeyText.trim()) {
      setStatusNote("Please enter an Answer Key for OMR comparison.");
      return;
    }

    setLoading(true);
    setStatusNote(null);
    setDebugError(null);
    try {
      const form = new FormData();
      form.append("answerKey", omrKeyText);
      form.append("responses", omrResponseText);
      omrFileRefs.forEach((file) => form.append("omrFiles", file));

      const res = await fetch("/api/omr", { method: "POST", body: form });
      const data = (await res.json()) as ApiPayload<CustomOmrResult> & { visionUsed?: boolean; parsedResponses?: string };
      if (!res.ok) {
        setOmrResult(evaluateCustomOmr(omrKeyText, omrResponseText));
        setDebugError(data.debug || null);
        setStatusNote(data.error || `OMR API failed with status ${res.status}. Used manual text fallback.`);
        return;
      }
      if (data.parsedResponses) setOmrResponseText(data.parsedResponses);
      setOmrResult(data);
      setStatusNote(data.visionUsed ? "OMR sheet read with Gemini Vision." : "OMR scored from text responses.");
      fetchHistory();
      setWorkspace("omr");
    } catch (err: unknown) {
      console.error(err);
      setOmrResult(evaluateCustomOmr(omrKeyText, omrResponseText));
      setStatusNote(formatClientError("Network request failed. Scored OMR locally using response text", err));
    } finally {
      setLoading(false);
    }
  };

  // Delete evaluation item
  const deleteItem = async (id: string, type: string) => {
    try {
      const res = await fetch("/api/evaluations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type }),
      });
      if (res.ok) {
        setHistoryItems((prev) => prev.filter((item) => item.id !== id));
        setStatusNote("History item deleted successfully.");
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string; debug?: DebugError };
        setDebugError(data.debug || null);
        setStatusNote(data.error || `Failed to delete history item. Status: ${res.status}`);
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      setStatusNote(formatClientError("An error occurred while deleting the history item", error));
    }
  };

  // Clear all history logs
  const clearHistory = async () => {
    if (!confirm("Are you sure you want to clear all history?")) return;
    try {
      const res = await fetch("/api/evaluations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAll: true }),
      });
      if (res.ok) {
        setHistoryItems([]);
        setStatusNote("All history logs cleared.");
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string; debug?: DebugError };
        setDebugError(data.debug || null);
        setStatusNote(data.error || `Failed to clear history. Status: ${res.status}`);
      }
    } catch (error) {
      console.error("Failed to clear history:", error);
      setStatusNote(formatClientError("An error occurred while clearing history", error));
    }
  };

  // Load history item back to active states
  const loadHistoryItem = (item: HistoryRecord) => {
    if (item.type === "descriptive") {
      const savedStudent = item.resultJson.student as Partial<Student> | undefined;
      
      setStudentName(savedStudent?.name || item.title.replace(/\s*\(NEET\)|\s*\(JEE\)/g, ""));
      setRollNumber(savedStudent?.roll || item.subtitle.split(" - Roll: ").pop() || "");
      setStream(savedStudent?.stream || (item.title.includes("NEET") ? "NEET" : "JEE"));
      setSubject(savedStudent?.subject || item.subtitle.split(" - Roll: ")[0] || "");
      setBatch(savedStudent?.batch || "");
      setExamType(savedStudent?.examType || "");
      setSection(savedStudent?.section || "");
      
      setAnswerText(savedStudent?.answerText || String(item.resultJson.answerText || ""));
      setMarkingCriteria(String(item.resultJson.rubricText || criteriaText));
      setResult(item.resultJson as unknown as EvaluationResult);
      setStatusNote(`Loaded descriptive evaluation for ${savedStudent?.name || item.title} from history.`);
      setWorkspace("insights");
    } else {
      setOmrKeyText(String(item.resultJson.answerKey || ""));
      setOmrResponseText(String(item.resultJson.responses || ""));
      setOmrResult(item.resultJson as unknown as CustomOmrResult);
      setStatusNote(`Loaded OMR evaluation from history.`);
      setWorkspace("omr");
    }
  };

  // File selection validation helpers
  const addFiles = (
    files: FileList | null,
    setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>,
    refSetter?: React.Dispatch<React.SetStateAction<File[]>>
  ) => {
    if (!files) return;
    const list = Array.from(files);
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    
    const validFiles = list.filter((file) => {
      if (file.size > MAX_SIZE) {
        setStatusNote(`File "${file.name}" is too large. Max size is 5MB.`);
        return false;
      }
      if (file.type && !allowedTypes.includes(file.type)) {
        setStatusNote(`File "${file.name}" is not supported. Please upload PNG, JPG, WEBP, or PDF.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setter((prev) => [...prev, ...validFiles.map((file) => ({ name: file.name, size: file.size, type: file.type || "file" }))]);
    refSetter?.((prev) => [...prev, ...validFiles]);
  };

  // Export report
  const downloadReport = () => {
    const currentStudent: Student = {
      name: studentName,
      roll: rollNumber,
      stream: stream,
      subject: subject,
      answerText: answerText,
      omr: omrResponseText ? omrResponseText.trim().split(/\s+/) : [],
      batch: batch || undefined,
      examType: examType || undefined,
      section: section || undefined,
    };
    const html = buildReportHtml(currentStudent, result, omrResult);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${rollNumber}-prepforge-evaluation.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-background text-foreground pb-12">
      <Navbar />

      <div className="console-page">
        {/* Header Greeting */}
        <header className="console-header">
          <h1 className="console-greeting">
            {user?.firstName ? `Welcome, ${user.firstName}` : "Welcome, Faculty"}
          </h1>
          <p className="console-subtext">
            PrepForge Evaluation Console. Input custom details, upload sheets, and check results dynamically.
          </p>
        </header>

        {/* Global Warnings / Debug Info */}
        {statusNote && (
          <div className="warning-banner" style={{ background: "var(--accent-soft)", borderColor: "var(--border-accent)", color: "var(--text-primary)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={16} className="text-indigo-600" />
              <span>{statusNote}</span>
            </div>
          </div>
        )}
        {debugError && (
          <div className="warning-banner" style={{ background: "var(--error-soft)", borderColor: "rgba(239, 68, 68, 0.2)", color: "var(--error)", marginBottom: 20 }}>
            <strong>{debugError.component} ({debugError.kind}):</strong> {debugError.message}
          </div>
        )}

        {/* Console Dashboard Flex Container */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Active Student Details Banner */}
          <div className="result-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24, borderLeft: "4px solid var(--accent)", padding: "20px 24px", margin: 0 }}>
            <div style={{ flex: 1, minWidth: "260px" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--accent)" }}>Currently Evaluating</p>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginTop: 2 }}>{studentName || "Configure Student Details"}</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5 }}>
                Roll: <strong>{rollNumber || "N/A"}</strong> | Stream: <strong>{stream}</strong> | Subject: <strong>{subject || "General"}</strong>
                {batch && <> | Batch: <strong>{batch}</strong></>}
                {section && <> | Sec: <strong>{section}</strong></>}
                {examType && <> | Exam: <strong>{examType}</strong></>}
              </p>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ background: "var(--bg-surface)", padding: "8px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", textAlign: "center", minWidth: "90px" }}>
                  <p style={{ fontSize: "0.65rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 650 }}>Descriptive</p>
                  <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--accent)", marginTop: 1 }}>{result.score}/100</p>
                </div>
                {result.handwritingConfidence !== undefined && (
                  <div style={{ background: "var(--bg-surface)", padding: "8px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", textAlign: "center", minWidth: "90px" }}>
                    <p style={{ fontSize: "0.65rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 650 }}>Handwriting</p>
                    <p style={{ fontSize: "1.1rem", fontWeight: 800, color: result.handwritingConfidence >= 80 ? "#22c55e" : result.handwritingConfidence >= 50 ? "#eab308" : "#ef4444", marginTop: 1 }}>
                      {result.handwritingConfidence}%
                    </p>
                  </div>
                )}
                <div style={{ background: "var(--bg-surface)", padding: "8px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", textAlign: "center", minWidth: "90px" }}>
                  <p style={{ fontSize: "0.65rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 650 }}>OMR score</p>
                  <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--accent)", marginTop: 1 }}>{omrResult.score}/{omrResult.total}</p>
                </div>
              </div>

              <button
                onClick={() => setShowConfigModal(true)}
                className="btn-primary animate-fade"
                style={{ padding: "10px 18px", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
              >
                <UserCheck size={14} />
                Configure Details
              </button>
            </div>
          </div>

          {/* Student Configurator Modal overlay */}
          {showConfigModal && (
            <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.3)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
              <div className="student-form-card" style={{ maxWidth: "480px", width: "100%", margin: 0, position: "relative", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)", background: "var(--bg-card)", padding: 24, borderRadius: "var(--radius-lg)" }}>
                <button
                  onClick={() => setShowConfigModal(false)}
                  style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)" }}
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
                
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <UserCheck size={18} style={{ color: "var(--accent)" }} />
                  Student Configurator
                </h2>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 16 }}>
                  Define the student parameters below. Evaluation records and score mappings will bind to these settings.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="form-group">
                    <label htmlFor="student-name">Student Name</label>
                    <input
                      id="student-name"
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Enter student name"
                      style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="roll-number">Roll Number</label>
                    <input
                      id="roll-number"
                      type="text"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      placeholder="e.g. JES-2026-004"
                      style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}
                    />
                  </div>

                  <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10, display: "grid" }}>
                    <div className="form-group">
                      <label htmlFor="student-batch">Batch</label>
                      <input
                        id="student-batch"
                        type="text"
                        value={batch}
                        onChange={(e) => setBatch(e.target.value)}
                        placeholder="e.g. Batch-A"
                        style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="student-section">Section</label>
                      <input
                        id="student-section"
                        type="text"
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        placeholder="e.g. Sec-1"
                        style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="student-subject">Subject Focus</label>
                    <input
                      id="student-subject"
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Physics"
                      style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}
                    />
                  </div>

                  <div className="form-grid" style={{ gridTemplateColumns: "1fr 1.2fr", gap: 10, display: "grid" }}>
                    <div className="form-group">
                      <label htmlFor="student-stream">Stream Focus</label>
                      <select
                        id="student-stream"
                        value={stream}
                        onChange={(e) => setStream(e.target.value as Stream)}
                        style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}
                      >
                        <option value="JEE">JEE</option>
                        <option value="NEET">NEET</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="student-exam">Exam Type</label>
                      <input
                        id="student-exam"
                        type="text"
                        value={examType}
                        onChange={(e) => setExamType(e.target.value)}
                        placeholder="e.g. Mains Mock"
                        style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowConfigModal(false)}
                  className="btn-primary"
                  style={{ marginTop: 20, width: "100%", justifyContent: "center", padding: "12px", cursor: "pointer" }}
                >
                  Save & Apply Config
                </button>
              </div>
            </div>
          )}

          {/* Workspaces & Dynamic Results */}
          <section className="min-w-0 space-y-4">
            
            {/* Top Workspace Tab Navs */}
            <nav className="result-tabs">
              {[
                ["descriptive", "Descriptive Answers", Brain],
                ["omr", "OMR Checking", ScanLine],
                ["insights", "Gaps & Steps", BarChart3],
                ["report", "Report Card", FileBadge],
                ["history", "History Logs", History],
              ].map(([id, label, Icon]) => (
                <button
                  key={id as string}
                  onClick={() => setWorkspace(id as Workspace)}
                  className={`result-tab ${workspace === id ? "active" : ""}`}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Icon size={14} />
                  {label as string}
                </button>
              ))}
            </nav>

            {/* Active Workspace Container (Animated via GSAP) */}
            <div className="workspace-content">
              
              {/* Tab 1: Descriptive Evaluation Config */}
              {workspace === "descriptive" && (
                <div className="space-y-4">
                  <div className="result-card">
                    <h3>Evaluate Descriptive Answers</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Upload scanned answer images or paste transcript text. Add marking criteria rules below.
                    </p>

                    <div className="upload-section">
                      <div className="form-group">
                        <label>1. Upload Student Answer Sheets</label>
                        <UploadDrop
                          inputId="answer-files"
                          onAdd={(files) => addFiles(files, setAnswerFiles, setAnswerFileRefs)}
                        />
                        <FileList
                          files={answerFiles}
                          onRemove={(index) => {
                            setAnswerFiles((prev) => prev.filter((_, i) => i !== index));
                            setAnswerFileRefs((prev) => prev.filter((_, i) => i !== index));
                          }}
                        />
                      </div>

                      <div className="form-group">
                        <label>2. Upload Custom Marking Criteria</label>
                        <UploadDrop
                          inputId="criteria-files"
                          onAdd={(files) => addFiles(files, setCriteriaFiles, setCriteriaFileRefs)}
                        />
                        <FileList
                          files={criteriaFiles}
                          onRemove={(index) => {
                            setCriteriaFiles((prev) => prev.filter((_, i) => i !== index));
                            setCriteriaFileRefs((prev) => prev.filter((_, i) => i !== index));
                          }}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="answer-transcript">Typed / OCR Answer Transcript</label>
                      <textarea
                        id="answer-transcript"
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="Paste student transcription here..."
                        style={{ minHeight: "180px", marginTop: 4 }}
                      />
                    </div>

                    <div className="form-group" style={{ marginTop: 16 }}>
                      <label htmlFor="marking-criteria">Marking Rubric & Steps</label>
                      <textarea
                        id="marking-criteria"
                        value={markingCriteria}
                        onChange={(e) => setMarkingCriteria(e.target.value)}
                        placeholder="Define grading steps or keywords..."
                        style={{ minHeight: "140px", marginTop: 4 }}
                      />
                    </div>

                    <button
                      onClick={runDescriptive}
                      disabled={loading}
                      className={`evaluate-btn ${loading ? "loading" : ""}`}
                      style={{ marginTop: 24 }}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          Processing Answer Sheets...
                        </>
                      ) : (
                        <>
                          <Brain size={18} />
                          Run Descriptive Evaluation
                        </>
                      )}
                    </button>
                  </div>

                  {/* Recent Evaluations Quick Pick list */}
                  <RecentEvaluationsList historyItems={historyItems} onLoad={loadHistoryItem} />
                </div>
              )}

              {/* Tab 2: OMR Evaluation Check */}
              {workspace === "omr" && (
                <div className="grid gap-6 grid-cols-1 xl:grid-cols-[1fr_360px]">
                  <div className="result-card" style={{ height: "fit-content" }}>
                    <h3>Scanned OMR Checking</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Upload student bubble sheets to process with Gemini Vision, or enter keys and responses manually.
                    </p>

                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label>Upload Scanned OMR Sheet</label>
                      <UploadDrop
                        inputId="omr-files"
                        onAdd={(files) => addFiles(files, setOmrFiles, setOmrFileRefs)}
                      />
                      <FileList
                        files={omrFiles}
                        onRemove={(index) => {
                          setOmrFiles((prev) => prev.filter((_, i) => i !== index));
                          setOmrFileRefs((prev) => prev.filter((_, i) => i !== index));
                        }}
                      />
                    </div>

                    <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div className="form-group">
                        <label htmlFor="omr-key">OMR Answer Key</label>
                        <input
                          id="omr-key"
                          type="text"
                          value={omrKeyText}
                          onChange={(e) => setOmrKeyText(e.target.value)}
                          placeholder="e.g. A B C D B A"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="omr-responses">Student Responses</label>
                        <input
                          id="omr-responses"
                          type="text"
                          value={omrResponseText}
                          onChange={(e) => setOmrResponseText(e.target.value)}
                          placeholder="e.g. A B - D ?"
                        />
                      </div>
                    </div>

                    <button
                      onClick={runOmr}
                      disabled={loading}
                      className="evaluate-btn"
                      style={{ marginTop: 24, background: "linear-gradient(135deg, var(--warning), #D97706)" }}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          Checking OMR Bubbles...
                        </>
                      ) : (
                        <>
                          <ScanLine size={18} />
                          Evaluate OMR Sheet
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <OmrDashboard result={omrResult} />
                  </div>
                </div>
              )}

              {/* Tab 3: AI Insights & Step marks */}
              {workspace === "insights" && (
                <div className="space-y-4">
                  {result.handwritingConfidence !== undefined && (
                    <div className="result-card" style={{ borderLeft: `4px solid ${result.handwritingConfidence >= 80 ? "var(--success)" : result.handwritingConfidence >= 50 ? "var(--warning)" : "var(--error)"}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                        <div>
                          <h3 style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                            <ShieldCheck size={20} style={{ color: result.handwritingConfidence >= 80 ? "#22c55e" : result.handwritingConfidence >= 50 ? "#eab308" : "#ef4444" }} />
                            Handwriting Fairness & OCR Confidence Audit
                          </h3>
                          <p className="text-sm text-slate-500 mt-2 mb-0">
                            OCR confidence score: <strong>{result.handwritingConfidence}%</strong>. 
                            {result.handwritingNeedsReview 
                              ? " Critical low-confidence zones detected in student handwriting. Human review is recommended." 
                              : " Handwriting clarity satisfies the quality threshold. Auto-grading proceeded without flags."}
                          </p>
                        </div>
                        <Link 
                          href="/handwriting-fairness" 
                          className="btn-secondary" 
                          style={{ padding: "8px 16px", textDecoration: "none", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 6 }}
                        >
                          Open Fairness Dashboard →
                        </Link>
                      </div>
                      
                      {result.handwritingDetails && result.handwritingDetails.length > 0 && (
                        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                          {result.handwritingDetails.map((page) => (
                            <div 
                              key={page.pageIndex} 
                              style={{ 
                                background: "var(--bg-surface)", 
                                border: "1px solid var(--border)", 
                                borderRadius: "var(--radius-md)", 
                                padding: "12px 14px" 
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>Page {page.pageIndex + 1}</span>
                                <span 
                                  style={{ 
                                    fontSize: "0.75rem", 
                                    fontWeight: 700, 
                                    color: page.pageConfidence >= 80 ? "#22c55e" : page.pageConfidence >= 50 ? "#eab308" : "#ef4444" 
                                  }}
                                >
                                  {page.pageConfidence}%
                                </span>
                              </div>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                                <span>Flagged words: {page.flaggedWordCount} ({page.redWordCount} critical)</span>
                                <span style={{ textTransform: "capitalize", fontWeight: 600, color: "var(--text-tertiary)", marginTop: 2 }}>
                                  Action: {page.recommendation.replace(/_/g, " ")}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stepwise evaluation results */}
                  <div className="result-card">
                    <h3>Step-wise Grades and Chain-of-Thought Reasoning</h3>
                    <p className="text-sm text-slate-500 mb-6">
                      AI evaluated marks per rubric point, backed by semantic citations and step verification.
                    </p>
                    <StepGrades result={result} />
                  </div>

                  {/* Syllabus Gap Analysis */}
                  <GapDashboard result={result} />

                  {/* Retrieval pipeline trace */}
                  <RetrievalTracePanel result={result} />
                </div>
              )}

              {/* Tab 4: Printable dynamic report card */}
              {workspace === "report" && (
                <div className="grid gap-6 grid-cols-1 xl:grid-cols-[1fr_260px]">
                  <ReportPreview
                    student={{
                      name: studentName,
                      roll: rollNumber,
                      stream: stream,
                      subject: subject,
                      answerText: answerText,
                      omr: omrResponseText ? omrResponseText.trim().split(/\s+/) : [],
                      batch: batch || undefined,
                      examType: examType || undefined,
                    }}
                    result={result}
                    omr={omrResult}
                  />

                  <div className="result-card" style={{ height: "fit-content" }}>
                    <h3>Report Actions</h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Export this student evaluation as a standalone HTML file containing step grades and gap analytics.
                    </p>
                    <button
                      onClick={downloadReport}
                      className="btn-primary w-full"
                      style={{ justifyContent: "center" }}
                    >
                      <Download size={16} />
                      Download HTML
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 5: Evaluation history */}
              {workspace === "history" && (
                <div className="result-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <h3>Evaluation History Log</h3>
                      <p className="text-sm text-slate-500">
                        Historical list of descriptive and OMR checking sessions saved to the database.
                      </p>
                    </div>
                    {historyItems.length > 0 && (
                      <button
                        onClick={clearHistory}
                        className="file-item-remove"
                        style={{ padding: "8px 16px", borderRadius: "var(--radius-md)" }}
                      >
                        Clear All History
                      </button>
                    )}
                  </div>

                  {loadingHistory ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
                      <Loader2 className="animate-spin text-[var(--accent)]" size={32} />
                    </div>
                  ) : historyItems.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-tertiary)" }}>
                      <History size={40} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
                      <p>No historical evaluation records found.</p>
                    </div>
                  ) : (
                    <div className="history-list">
                      {historyItems.map((item) => (
                        <div key={item.id} className="history-item">
                          <div className="history-meta">
                            <span className="history-name">{item.title}</span>
                            <span className="history-detail">{item.subtitle}</span>
                            <span className="history-detail" style={{ fontSize: "0.7rem", marginTop: 4 }}>
                              {new Date(item.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <div style={{ textAlign: "right" }}>
                              <p className="history-score">{item.score}/{item.total}</p>
                              <p className="history-detail" style={{ textTransform: "uppercase", fontSize: "0.68rem", fontWeight: 700, color: "var(--accent)" }}>
                                {item.type}
                              </p>
                              {item.resultJson && typeof item.resultJson === "object" && "handwritingConfidence" in item.resultJson && (
                                <p style={{ fontSize: "0.65rem", color: "var(--text-secondary)", marginTop: 2 }}>
                                  HW: <strong style={{ color: (item.resultJson.handwritingConfidence as number) >= 80 ? "#22c55e" : (item.resultJson.handwritingConfidence as number) >= 50 ? "#eab308" : "#ef4444" }}>
                                    {item.resultJson.handwritingConfidence as number}%
                                  </strong>
                                </p>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                onClick={() => loadHistoryItem(item)}
                                className="btn-secondary"
                                style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                              >
                                Load
                              </button>
                              <button
                                onClick={() => deleteItem(item.id, item.type)}
                                className="file-item-remove"
                                style={{ border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, padding: 0 }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </section>

        </div>
      </div>
    </main>
  );
}

// OMR Bubble Scorer View
function OmrDashboard({ result }: { result: CustomOmrResult }) {
  return (
    <div className="space-y-4">
      <div className="result-card">
        <h3>OMR Performance Audit</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            ["Correct", result.correct, "var(--success-soft)", "var(--success)"],
            ["Wrong", result.wrong, "var(--error-soft)", "var(--error)"],
            ["Blank", result.blank, "var(--bg-surface)", "var(--text-secondary)"],
            ["Review", result.anomalies.length, "var(--warning-soft)", "var(--warning)"],
          ].map(([label, value, bg, color]) => (
            <div
              key={label}
              style={{
                background: bg as string,
                color: color as string,
                padding: "10px 6px",
                borderRadius: "var(--radius-md)",
                textAlign: "center",
                border: `1px solid ${label === "Blank" ? "var(--border)" : "transparent"}`,
              }}
            >
              <p style={{ fontSize: "1.25rem", fontWeight: 800 }}>{value}</p>
              <p style={{ fontSize: "0.7rem", opacity: 0.85, fontWeight: 600 }}>{label}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "300px", overflowY: "auto", paddingRight: 4 }}>
          {result.items.map((item) => (
            <div
              key={item.question}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-card)",
              }}
            >
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", minWidth: 28 }}>
                Q{item.question}
              </span>
              
              <div style={{ display: "flex", gap: 5 }}>
                {["A", "B", "C", "D"].map((option) => {
                  const isSelected = item.selected === option;
                  const isCorrect = item.correct === option;
                  let bg = "transparent";
                  let border = "1px solid var(--border)";
                  let color = "var(--text-tertiary)";

                  if (isSelected) {
                    if (item.status === "correct") {
                      bg = "var(--success)";
                      border = "1px solid var(--success)";
                      color = "white";
                    } else if (item.status === "wrong") {
                      bg = "var(--error)";
                      border = "1px solid var(--error)";
                      color = "white";
                    } else {
                      bg = "var(--warning)";
                      border = "1px solid var(--warning)";
                      color = "white";
                    }
                  } else if (isCorrect) {
                    bg = "var(--success-soft)";
                    border = "1px solid var(--success)";
                    color = "var(--success)";
                  }

                  return (
                    <span
                      key={option}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        background: bg,
                        border: border,
                        color: color,
                      }}
                    >
                      {option}
                    </span>
                  );
                })}
              </div>

              <span style={{ fontSize: "0.8rem", fontWeight: 700, minWidth: 44, textAlign: "right" }}>
                {item.status === "anomaly" ? "Review" : item.score > 0 ? `+${item.score}` : item.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="result-card">
        <h3>Subject Breakdown</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {result.subjectWise.map((sub) => (
            <div
              key={sub.subject}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-surface)",
              }}
            >
              <div>
                <p style={{ fontWeight: 700, fontSize: "0.85rem" }}>{sub.subject}</p>
                <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{sub.accuracy}% accuracy</p>
              </div>
              <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--accent)" }}>
                {sub.score}/{sub.total}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// StepWise detailed Grades
function StepGrades({ result }: { result: EvaluationResult }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {result.stepGrades.map((grade) => (
        <div key={grade.rubricId} className="step-grade">
          <div className="step-grade-header">
            <span className="step-grade-topic">{grade.topic}</span>
            <span className={`step-grade-score ${grade.status}`}>
              {grade.awarded}/{grade.max}
            </span>
          </div>

          <p style={{ fontSize: "0.82rem", color: "var(--text-tertiary)", marginBottom: 8 }}>
            <strong>Expected:</strong> {grade.expected}
          </p>

          {grade.reasoning && (
            <div className="step-grade-reasoning">
              <span style={{ fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                Chain-of-Thought Grading
              </span>
              {grade.reasoning}
            </div>
          )}

          <p className="step-grade-note">{grade.note}</p>

          {grade.citations && grade.citations.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {grade.citations.map((citation) => (
                <p key={citation.id} className="step-grade-evidence" title={citation.excerpt}>
                  &ldquo;{citation.excerpt}&rdquo; &mdash; <strong>{citation.source}</strong> (line {citation.line})
                </p>
              ))}
            </div>
          )}
        </div>
      ))}
      {result.aiText && (
        <div style={{ background: "var(--accent-soft)", border: "1px solid var(--border-accent)", borderRadius: "var(--radius-md)", padding: 16, fontSize: "0.88rem", lineHeight: 1.6 }}>
          <strong>Faculty Feedback Summary:</strong>
          <p style={{ marginTop: 4, color: "var(--text-secondary)" }}>{result.aiText}</p>
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

// Strengths, gaps, and action item dashboard block
function GapDashboard({ result }: { result: EvaluationResult }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
      
      <div className="result-card" style={{ margin: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <BadgeCheck color="var(--success)" size={20} />
          <h3>Key Strengths</h3>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {result.strengths.map((item) => (
            <span key={item} className="tag strength">{item}</span>
          ))}
        </div>
      </div>
      
      <div className="result-card" style={{ margin: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <AlertTriangle color="var(--error)" size={20} />
          <h3>Syllabus Gaps</h3>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {result.gaps.map((item) => (
            <span key={item} className="tag gap">{item}</span>
          ))}
        </div>
      </div>

      <div className="result-card" style={{ margin: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <MessageSquareText color="var(--info)" size={20} />
          <h3>Action Plan Recommendations</h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {result.recommendations.map((item, index) => (
            <div
              key={index}
              style={{
                fontSize: "0.82rem",
                color: "var(--text-secondary)",
                lineHeight: 1.5,
                background: "var(--bg-surface)",
                padding: 10,
                borderRadius: "var(--radius-sm)",
                borderLeft: "3px solid var(--info)",
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// Trace logs
function RetrievalTracePanel({ result }: { result: EvaluationResult }) {
  return (
    <div className="result-card">
      <h3>AI Grading Pipeline Retrieval Trace</h3>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {result.retrievalTrace.map((trace, index) => (
          <div key={index} className="trace-step">
            <span className="trace-badge">{trace.stage}</span>
            <span className="trace-detail">{trace.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Side List of Recent Evaluations
function RecentEvaluationsList({
  historyItems,
  onLoad,
}: {
  historyItems: HistoryRecord[];
  onLoad: (item: HistoryRecord) => void;
}) {
  const descriptiveHistory = historyItems.filter((h) => h.type === "descriptive");
  if (!descriptiveHistory.length) return null;

  return (
    <div className="student-form-card" style={{ padding: 20 }}>
      <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 12, color: "var(--text-secondary)" }}>
        Recent Evaluations
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "250px", overflowY: "auto", paddingRight: 4 }}>
        {descriptiveHistory.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => onLoad(item)}
            className="w-full text-left p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--accent)] hover:bg-[var(--bg-card-hover)] transition-all flex flex-col gap-1"
          >
            <div className="flex justify-between items-start gap-2">
              <span className="font-semibold text-xs text-[var(--text-primary)] truncate" style={{ maxWidth: "160px" }}>
                {item.title}
              </span>
              <span className="font-bold text-xs text-[var(--accent)] shrink-0">
                {item.score}/{item.total}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 truncate">
              {item.subtitle}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Printable dynamic report card
function ReportPreview({
  student,
  result,
  omr,
}: {
  student: Student;
  result: EvaluationResult;
  omr: CustomOmrResult;
}) {
  return (
    <div className="result-card" style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, borderBottom: "1px solid var(--border)", paddingBottom: 20, marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)" }}>
            PrepForge Evaluation Report
          </p>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, marginTop: 4 }}>{student.name}</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 2 }}>
            Roll: {student.roll} | Stream: {student.stream} | Subject: {student.subject} {student.batch && `| Batch: ${student.batch}`}
          </p>
        </div>
        <div style={{ background: "var(--accent-soft)", padding: "12px 20px", borderRadius: "var(--radius-md)", textAlign: "right", border: "1px solid var(--border-accent)" }}>
          <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent)", lineHeight: 1 }}>
            {result.score}/100
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 4 }}>
            OMR: {omr.score}/{omr.total}
          </p>
          {result.handwritingConfidence !== undefined && (
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2 }}>
              Handwriting: <strong style={{ color: result.handwritingConfidence >= 80 ? "#22c55e" : result.handwritingConfidence >= 50 ? "#eab308" : "#ef4444" }}>
                {result.handwritingConfidence}%
              </strong>
            </p>
          )}
        </div>
      </div>
      
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 8 }}>Executive Summary</h4>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{result.summary}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <div style={{ background: "var(--bg-surface)", padding: 16, borderRadius: "var(--radius-md)" }}>
          <h5 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--success)", marginBottom: 8 }}>Strengths</h5>
          <ul style={{ paddingLeft: 16, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {result.strengths.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
        <div style={{ background: "var(--bg-surface)", padding: 16, borderRadius: "var(--radius-md)" }}>
          <h5 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--error)", marginBottom: 8 }}>Gaps & Weaknesses</h5>
          <ul style={{ paddingLeft: 16, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {result.gaps.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
        <div style={{ background: "var(--bg-surface)", padding: 16, borderRadius: "var(--radius-md)" }}>
          <h5 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--info)", marginBottom: 8 }}>Action Items</h5>
          <ul style={{ paddingLeft: 16, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {result.recommendations.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Drag & Drop Area Component
function UploadDrop({ inputId, onAdd }: { inputId: string; onAdd: (files: FileList | null) => void }) {
  return (
    <label htmlFor={inputId} className="upload-zone" style={{ display: "block", marginTop: 4 }}>
      <input id={inputId} type="file" multiple className="hidden" onChange={(event) => onAdd(event.target.files)} />
      <Upload className="mx-auto mb-2 text-indigo-500" size={24} style={{ color: "var(--accent)" }} />
      <h4>Click or Drag Files here</h4>
      <p>Supports scanned JPG, PNG, WEBP and PDF up to 5MB</p>
    </label>
  );
}

// Uploaded file list
function FileList({ files, onRemove }: { files: UploadedFile[]; onRemove: (index: number) => void }) {
  if (!files.length) return null;
  return (
    <div className="file-list">
      {files.map((file, index) => (
        <div key={`${file.name}-${index}`} className="file-item">
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <FileText size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <span className="file-item-name truncate">{file.name}</span>
          </div>
          <button onClick={() => onRemove(index)} className="file-item-remove">
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

// Helper to format client-side errors
function formatClientError(prefix: string, error: unknown) {
  if (error instanceof Error) {
    return `${prefix}: ${error.message}`;
  }
  return `${prefix}: ${String(error)}`;
}

// Dynamic report HTML builder
function buildReportHtml(student: Student, result: EvaluationResult, omr: CustomOmrResult) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${student.roll} PrepForge Report</title><style>body{font-family:Arial,sans-serif;margin:40px;color:#0f172a}.score{float:right;background:#6366f1;color:white;padding:16px 20px;border-radius:12px}.card{border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:14px 0}.badge{display:inline-block;margin:4px;padding:5px 8px;border-radius:999px;background:#e0f2fe;color:#075985;font-size:12px}</style></head><body><div class="score"><b>${result.score}/100</b><br>OMR ${omr.score}/${omr.total}${result.handwritingConfidence !== undefined ? `<br>Handwriting: ${result.handwritingConfidence}%` : ""}</div><h1>PrepForge Report</h1><p>Student: ${student.name} | Roll: ${student.roll} | Stream: ${student.stream} ${student.batch ? `| Batch: ${student.batch}` : ""}</p><div class="card"><b>Summary</b><p>${result.summary}</p></div><div class="card"><b>Step Marks</b>${result.stepGrades.map((grade) => `<p>${grade.topic}: ${grade.awarded}/${grade.max} - ${grade.note}</p>${grade.citations.map((citation) => `<span class="badge">${citation.source}, line ${citation.line}</span>`).join("")}`).join("")}</div><div class="card"><b>OMR</b><p>Correct: ${omr.correct}, Wrong: ${omr.wrong}, Blank: ${omr.blank}, Accuracy: ${omr.accuracy}%</p></div><div class="card"><b>Improvement Plan</b>${result.recommendations.map((item) => `<p>${item}</p>`).join("")}</div></body></html>`;
}
