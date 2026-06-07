"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
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
  type LucideIcon,
} from "lucide-react";
import {
  answerKey,
  evaluateCustomOmr,
  evaluateLocally,
  rankStudents,
  students,
  type CustomOmrResult,
  type EvaluationResult,
  type Student,
  type Stream,
  type UploadedFile,
} from "@/lib/evaluation";
import type { DebugError } from "@/lib/debug";

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
  const [workspace, setWorkspace] = useState<Workspace>("descriptive");
  const [stream, setStream] = useState<Stream>("JEE");
  const [selectedRoll, setSelectedRoll] = useState(students.find((student) => student.stream === "JEE")?.roll || students[0].roll);
  const selectedStudent = students.find((student) => student.roll === selectedRoll) || students[0];
  const [answerText, setAnswerText] = useState(selectedStudent.answerText);
  const [markingCriteria, setMarkingCriteria] = useState(criteriaText);
  const [answerFiles, setAnswerFiles] = useState<UploadedFile[]>([]);
  const [criteriaFiles, setCriteriaFiles] = useState<UploadedFile[]>([]);
  const [omrFiles, setOmrFiles] = useState<UploadedFile[]>([]);
  const [answerFileRefs, setAnswerFileRefs] = useState<File[]>([]);
  const [criteriaFileRefs, setCriteriaFileRefs] = useState<File[]>([]);
  const [omrFileRefs, setOmrFileRefs] = useState<File[]>([]);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [omrKeyText, setOmrKeyText] = useState(answerKey.join(" "));
  const [omrResponseText, setOmrResponseText] = useState(selectedStudent.omr.join(" "));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResult>(() => evaluateLocally(selectedStudent));
  const [omrResult, setOmrResult] = useState<CustomOmrResult>(() => evaluateCustomOmr(answerKey.join(" "), selectedStudent.omr.join(" ")));
  const [historyItems, setHistoryItems] = useState<HistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [debugError, setDebugError] = useState<DebugError | null>(null);

  const consoleContainerRef = useRef<HTMLDivElement>(null);

  // GSAP View Stagger Transition on workspace tab switch
  useEffect(() => {
    gsap.fromTo(
      ".workspace-animate",
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }
    );
  }, [workspace]);

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
  }, [workspace]);

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

  const loadHistoryItem = (item: HistoryRecord) => {
    if (item.type === "descriptive") {
      const savedStudent = item.resultJson.student as Partial<Student> | undefined;
      const student: Student = {
        name: savedStudent?.name || item.title.replace(/\s*\(NEET\)|\s*\(JEE\)/g, ""),
        roll: savedStudent?.roll || item.subtitle.split(" - Roll: ").pop() || "",
        stream: savedStudent?.stream || (item.title.includes("NEET") ? "NEET" : "JEE"),
        subject: savedStudent?.subject || item.subtitle.split(" - Roll: ")[0] || "",
        answerText: savedStudent?.answerText || String(item.resultJson.answerText || ""),
        omr: savedStudent?.omr || [],
      };
      setSelectedRoll(student.roll || selectedRoll);
      setAnswerText(String(item.resultJson.answerText || ""));
      setMarkingCriteria(String(item.resultJson.rubricText || criteriaText));
      setResult(item.resultJson as unknown as EvaluationResult);
      setStatusNote(`Loaded descriptive evaluation for ${student.name} from history.`);
      setWorkspace("insights");
    } else {
      setOmrKeyText(String(item.resultJson.answerKey || ""));
      setOmrResponseText(String(item.resultJson.responses || ""));
      setOmrResult(item.resultJson as unknown as CustomOmrResult);
      setStatusNote(`Loaded OMR evaluation from history.`);
      setWorkspace("omr");
    }
  };

  const streamStudents = useMemo(
    () => students.filter((student) => student.stream === stream),
    [stream]
  );
  const ranked = useMemo(
    () => rankStudents(streamStudents.map((student) => ({ student, result: evaluateLocally(student) }))),
    [streamStudents]
  );

  const selectStream = (next: Stream) => {
    const nextStudent = students.find((student) => student.stream === next) || students[0];
    setStream(next);
    selectStudent(nextStudent);
  };

  const selectStudent = (student: Student) => {
    setSelectedRoll(student.roll);
    setAnswerText(student.answerText);
    setOmrResponseText(student.omr.join(" "));
    setResult(evaluateLocally(student));
    setOmrResult(evaluateCustomOmr(omrKeyText, student.omr.join(" ")));
  };

  const runDescriptive = async () => {
    setLoading(true);
    setStatusNote(null);
    setDebugError(null);
    try {
      const form = new FormData();
      form.append("student", JSON.stringify(selectedStudent));
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

  const runOmr = async () => {
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
        setWorkspace("omr");
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

  const addFiles = (
    files: FileList | null,
    setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>,
    refSetter?: React.Dispatch<React.SetStateAction<File[]>>
  ) => {
    if (!files) return;
    const list = Array.from(files);
    const MAX_SIZE = 8 * 1024 * 1024; // 8MB limit
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    
    const validFiles = list.filter((file) => {
      if (file.size > MAX_SIZE) {
        setStatusNote(`File "${file.name}" is too large. Max size is 8MB.`);
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

  const downloadReport = () => {
    const html = buildReportHtml(selectedStudent, result, omrResult);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedStudent.roll}-prepforge-evaluation.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main ref={consoleContainerRef} className="min-h-screen overflow-x-hidden bg-[#FAF9FC] text-slate-800">
      {/* Premium Light Header */}
      <header className="border-b border-slate-200 bg-white px-5 py-4 md:px-8 shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
              <Brain size={20} />
            </span>
            <span className="text-lg font-black text-slate-900">Prep<span className="text-indigo-600">Forge</span></span>
          </Link>
          <div className="hidden sm:flex gap-2">
            {(["JEE", "NEET"] as Stream[]).map((item) => (
              <button
                key={item}
                onClick={() => selectStream(item)}
                className={`rounded-xl border px-4 py-2 text-xs font-black transition-all ${
                  stream === item
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-md"
                    : "border-slate-200 bg-white text-slate-600 hover:text-slate-900"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-5 md:px-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        
        {/* Mobile Viewports: Selectors and Horizontal Tabs */}
        <div className="min-w-0 space-y-4 lg:hidden">
          {statusNote && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800 shadow-sm">
              {statusNote}
            </div>
          )}
          {debugError && <DebugPanel debug={debugError} />}
          
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            {/* Student Dropdown Picker */}
            <div className="min-w-0">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Student</label>
              <select
                value={selectedRoll}
                onChange={(e) => {
                  const student = students.find((s) => s.roll === e.target.value);
                  if (student) selectStudent(student);
                }}
                className="w-full min-w-0 rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 shadow-sm"
              >
                {students.filter((s) => s.stream === stream).map((s) => (
                  <option key={s.roll} value={s.roll}>
                    {s.name} ({s.roll})
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile Stream Selector */}
            <div className="min-w-0">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Stream Focus</label>
              <div className="flex h-[38px] min-w-0 rounded-lg border border-slate-200 bg-slate-100 p-1">
                {(["JEE", "NEET"] as Stream[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => selectStream(item)}
                    className={`flex-1 rounded-lg text-xs font-black transition-all ${
                      stream === item
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Horizontal Scrolling Navigation */}
          <div className="border-b border-slate-200 pb-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Workspace View</label>
            <div className="flex max-w-full gap-2 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
              {[
                ["descriptive", "Descriptive", Brain],
                ["omr", "OMR Check", ScanLine],
                ["insights", "Gaps & Ranks", BarChart3],
                ["report", "Report Preview", FileBadge],
                ["history", "History log", History],
              ].map(([id, label, Icon]) => (
                <button
                  key={id as string}
                  onClick={() => setWorkspace(id as Workspace)}
                  className={`flex shrink-0 snap-start items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black transition-all ${
                    workspace === id
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  <Icon size={14} />
                  {label as string}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Viewports: Standard Sidebar Panel */}
        <aside className="hidden lg:block space-y-4">
          <Panel
            icon={ShieldCheck}
            title="Faculty Evaluation console"
            text="Powered by Gemini: Vision OCR for answer sheets & OMR, embedding-based RAG rubric grading, and structured marks. Set GEMINI_API_KEY in .env."
          />
          {statusNote && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-5 text-amber-800 shadow-sm">
              {statusNote}
            </div>
          )}
          {debugError && <DebugPanel debug={debugError} />}
          <StudentPicker stream={stream} selected={selectedStudent} onSelect={selectStudent} />
          <nav className="grid gap-2">
            {[
              ["descriptive", "Descriptive Answers", Brain],
              ["omr", "OMR Evaluation", ScanLine],
              ["insights", "Gaps and Patterns", BarChart3],
              ["report", "Reports", FileBadge],
              ["history", "Evaluation History", History],
            ].map(([id, label, Icon]) => (
              <button
                key={id as string}
                onClick={() => setWorkspace(id as Workspace)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm font-bold transition-all duration-300 ${
                  workspace === id
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm"
                    : "border-slate-200/60 bg-white/70 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon size={16} />
                {label as string}
              </button>
            ))}
          </nav>
        </aside>

        {/* Workspace views with Slide-up GSAP trigger class */}
        <section className="workspace-animate min-w-0 space-y-6">
          <Metrics result={result} omr={omrResult} files={answerFiles.length + criteriaFiles.length + omrFiles.length} />

          {workspace === "descriptive" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <FeatureCard icon={Upload} title="Scanned answer sheets or images">
                <UploadDrop inputId="answer-files" onAdd={(files) => addFiles(files, setAnswerFiles, setAnswerFileRefs)} />
                <FileList files={answerFiles} onRemove={(index) => { setAnswerFiles((prev) => prev.filter((_, i) => i !== index)); setAnswerFileRefs((prev) => prev.filter((_, i) => i !== index)); }} />
                <Editor label="OCR transcript / typed answer" value={answerText} onChange={setAnswerText} minHeight="min-h-[250px]" />
              </FeatureCard>
              <FeatureCard icon={FileText} title="Predefined marking criteria">
                <UploadDrop inputId="criteria-files" onAdd={(files) => addFiles(files, setCriteriaFiles, setCriteriaFileRefs)} />
                <FileList files={criteriaFiles} onRemove={(index) => { setCriteriaFiles((prev) => prev.filter((_, i) => i !== index)); setCriteriaFileRefs((prev) => prev.filter((_, i) => i !== index)); }} />
                <Editor label="Rubric and step marking rules" value={markingCriteria} onChange={setMarkingCriteria} minHeight="min-h-[250px]" />
                <button
                  onClick={runDescriptive}
                  disabled={loading}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-black text-white hover:bg-indigo-500 shadow-md hover:shadow-indigo-500/20 disabled:opacity-60 transition cursor-pointer"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                  Evaluate Descriptive Answers
                </button>
              </FeatureCard>
            </div>
          )}

          {workspace === "omr" && (
            <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
              <FeatureCard icon={ScanLine} title="Answer key and OMR sheets">
                <UploadDrop inputId="omr-files" onAdd={(files) => addFiles(files, setOmrFiles, setOmrFileRefs)} />
                <FileList files={omrFiles} onRemove={(index) => { setOmrFiles((prev) => prev.filter((_, i) => i !== index)); setOmrFileRefs((prev) => prev.filter((_, i) => i !== index)); }} />
                <Editor label="Answer key" value={omrKeyText} onChange={setOmrKeyText} minHeight="min-h-[90px]" />
                <Editor label="Student OMR responses" value={omrResponseText} onChange={setOmrResponseText} minHeight="min-h-[90px]" />
                <button
                  onClick={runOmr}
                  disabled={loading}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-black text-white hover:bg-indigo-500 shadow-md disabled:opacity-60 transition cursor-pointer"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <ScanLine size={16} />}
                  Check OMR Sheet
                </button>
              </FeatureCard>
              <OmrDashboard result={omrResult} />
            </div>
          )}

          {workspace === "insights" && (
            <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
              <div className="space-y-4">
                <StepGrades result={result} />
                <GapDashboard result={result} />
              </div>
              <RankTable ranks={ranked} selected={selectedStudent} />
            </div>
          )}

          {workspace === "report" && (
            <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
              <ReportPreview student={selectedStudent} result={result} omr={omrResult} />
              <FeatureCard icon={Download} title="Detailed report export">
                <button onClick={downloadReport} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-500 transition shadow-md cursor-pointer">
                  <Download size={16} />
                  Download Report
                </button>
              </FeatureCard>
            </div>
          )}

          {workspace === "history" && (
            <FeatureCard icon={History} title="Evaluation History Log">
              <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
                <p className="text-xs text-slate-500">
                  Recent descriptive and OMR grading sessions stored in history.
                </p>
                {historyItems.length > 0 && (
                  <button onClick={clearHistory} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer">
                    Clear All History
                  </button>
                )}
              </div>

              {loadingHistory ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="animate-spin text-indigo-600" size={24} />
                </div>
              ) : historyItems.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
                  No evaluation history found. Run descriptive or OMR grading to save records.
                </div>
              ) : (
                <div className="grid gap-3">
                  {historyItems.map((item) => (
                    <div key={item.id} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.type === "descriptive" ? "bg-indigo-50 text-indigo-600" : "bg-teal-50 text-teal-600"}`}>
                          {item.type === "descriptive" ? <Brain size={18} /> : <ScanLine size={18} />}
                        </span>
                        <div className="min-w-0">
                          <p className="break-words text-sm font-bold text-slate-800">{item.title}</p>
                          <p className="mt-1 break-words text-xs text-slate-500">{item.subtitle}</p>
                          <p className="mt-1 text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center justify-between gap-4 sm:justify-end">
                        <div className="text-left sm:text-right">
                          <p className="text-sm font-black text-indigo-600">{item.score}/{item.total}</p>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{item.type}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => loadHistoryItem(item)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition cursor-pointer">
                            Load
                          </button>
                          <button onClick={() => deleteItem(item.id, item.type)} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 border border-rose-200 transition cursor-pointer">
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </FeatureCard>
          )}
        </section>
      </div>
    </main>
  );
}

function Metrics({ result, omr, files }: { result: EvaluationResult; omr: CustomOmrResult; files: number }) {
  const metrics = [
    ["Descriptive Score", `${result.score}/${result.total}`],
    ["OMR Score", `${omr.score}/${omr.total}`],
    ["OMR Accuracy", `${omr.accuracy}%`],
    ["File Scans", files],
  ];
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {metrics.map(([label, value]) => (
        <div key={label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="break-words text-xl font-black text-indigo-600 sm:text-2xl">{value}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        </div>
      ))}
    </div>
  );
}

function DebugPanel({ debug }: { debug: DebugError }) {
  return (
    <details className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 shadow-sm">
      <summary className="cursor-pointer font-black">
        {debug.component} - {debug.kind}: {debug.message}
      </summary>
      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-[11px] leading-5 text-rose-950 border border-rose-100">
        {JSON.stringify(debug, null, 2)}
      </pre>
    </details>
  );
}

function Panel({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
        <Icon size={20} />
      </div>
      <h2 className="font-black text-slate-800">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-250/70 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.015)] sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/50">
          <Icon size={18} />
        </span>
        <h2 className="min-w-0 break-words font-black text-slate-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function StudentPicker({ stream, selected, onSelect }: { stream: Stream; selected: Student; onSelect: (student: Student) => void }) {
  return (
    <div className="grid gap-2">
      {students.filter((student) => student.stream === stream).map((student) => (
        <button
          key={student.roll}
          onClick={() => onSelect(student)}
          className={`rounded-xl border p-4 text-left transition-all ${
            selected.roll === student.roll
              ? "border-indigo-600 bg-indigo-50/70 shadow-sm"
              : "border-slate-200/60 bg-white/75 hover:bg-slate-50 text-slate-700"
          }`}
        >
          <p className="break-words font-black text-slate-800">{student.name}</p>
          <p className="mt-1 break-words text-xs text-slate-400">{student.roll} &bull; {student.subject}</p>
        </button>
      ))}
    </div>
  );
}

function UploadDrop({ inputId, onAdd }: { inputId: string; onAdd: (files: FileList | null) => void }) {
  return (
    <label htmlFor={inputId} className="block cursor-pointer rounded-xl border border-dashed border-slate-250 bg-slate-50/40 p-5 text-center hover:border-indigo-500/50 hover:bg-slate-50 transition shadow-sm">
      <input id={inputId} type="file" multiple className="hidden" onChange={(event) => onAdd(event.target.files)} />
      <Upload className="mx-auto mb-2 text-indigo-500" size={24} />
      <p className="text-sm font-black text-slate-700">Upload scanned sheets</p>
      <p className="mt-1 text-xs text-slate-450">Images or PDFs up to 8MB</p>
    </label>
  );
}

function FileList({ files, onRemove }: { files: UploadedFile[]; onRemove: (index: number) => void }) {
  if (!files.length) return <div className="mt-3 rounded-xl border border-slate-150 bg-slate-50/40 p-3 text-xs text-slate-400">No files uploaded.</div>;
  return (
    <div className="mt-3 space-y-2">
      {files.map((file, index) => (
        <div key={`${file.name}-${index}`} className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <FileText size={16} className="text-indigo-500 shrink-0" />
          <p className="min-w-0 flex-1 break-all text-xs text-slate-700">{file.name}</p>
          <button onClick={() => onRemove(index)} className="text-slate-400 hover:text-rose-500 transition cursor-pointer">
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}

function Editor({ label, value, onChange, minHeight }: { label: string; value: string; onChange: (value: string) => void; minHeight: string }) {
  return (
    <label className="mt-4 block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className={`${minHeight} w-full resize-y rounded-xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-700 outline-none focus:border-indigo-500/60 shadow-sm`} />
    </label>
  );
}

function StepGrades({ result }: { result: EvaluationResult }) {
  return (
    <FeatureCard icon={Brain} title="Step-wise Marks & Grounded Citations">
      <div className="space-y-4">
        {result.stepGrades.map((grade) => (
          <div key={grade.rubricId} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-100 transition-all duration-300">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-800">{grade.topic}</p>
                <p className="mt-1 text-xs leading-5 text-slate-450">{grade.expected}</p>
              </div>
              <span className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-xs font-black text-indigo-700">{grade.awarded}/{grade.max}</span>
            </div>
            
            {grade.reasoning && (
              <div className="mt-3 rounded-lg bg-slate-50 border border-slate-150 p-3 text-xs leading-6 text-slate-600">
                <p className="font-bold text-slate-700 mb-1">AI Grading Reasoning:</p>
                {grade.reasoning}
              </div>
            )}

            <p className="mt-3 text-xs leading-6 text-slate-550">{grade.note}</p>
            
            {grade.citations && grade.citations.length > 0 && (
              <div className="mt-3.5 flex flex-wrap gap-2">
                {grade.citations.map((citation) => (
                  <span key={citation.id} title={citation.excerpt} className="rounded-full border border-indigo-100 bg-indigo-50/70 px-3 py-1 text-[10px] font-bold text-indigo-700">
                    Quote: "{citation.excerpt}" &bull; {citation.source}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {result.aiText && <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 text-xs leading-6 text-slate-600">{result.aiText}</div>}
        {result.warning && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800">{result.warning}</div>}
      </div>
    </FeatureCard>
  );
}

function OmrDashboard({ result }: { result: CustomOmrResult }) {
  return (
    <div className="space-y-4">
      <FeatureCard icon={ScanLine} title="OMR score and bubble audit">
        <div className="mb-4 grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[["Correct", result.correct], ["Wrong", result.wrong], ["Blank", result.blank], ["Review", result.anomalies.length]].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-150 bg-slate-50/50 p-3 text-center">
              <p className="text-xl font-black text-indigo-600">{value}</p>
              <p className="text-xs text-slate-500 font-medium">{label}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-2">
          {result.items.map((item) => (
            <div key={item.question} className="grid grid-cols-[34px_minmax(0,1fr)_52px] items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[42px_minmax(0,1fr)_70px] sm:gap-3 shadow-sm">
              <span className="text-xs font-black text-slate-400">Q{item.question}</span>
              <div className="flex min-w-0 flex-wrap gap-1.5 sm:gap-2">
                {["A", "B", "C", "D"].map((option) => (
                  <span key={option} className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-black ${item.selected === option ? statusColor(item.status) : item.correct === option ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-400"}`}>
                    {option}
                  </span>
                ))}
              </div>
              <span className="text-right text-xs font-black text-slate-700">{item.status === "anomaly" ? "Review" : item.score > 0 ? `+${item.score}` : item.score}</span>
            </div>
          ))}
        </div>
      </FeatureCard>
      <FeatureCard icon={BarChart3} title="Subject-wise performance">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {result.subjectWise.map((subject) => (
            <div key={subject.subject} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <p className="font-black text-slate-700 text-sm">{subject.subject}</p>
              <p className="mt-2 text-2xl font-black text-indigo-600">{subject.score}/{subject.total}</p>
              <p className="text-[11px] text-slate-400 font-bold">{subject.accuracy}% Accuracy</p>
            </div>
          ))}
        </div>
      </FeatureCard>
    </div>
  );
}

function GapDashboard({ result }: { result: EvaluationResult }) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
      <DashboardBlock icon={BadgeCheck} title="Strengths" items={result.strengths} colorClass="border-emerald-100 bg-emerald-50/30 text-emerald-800" />
      <DashboardBlock icon={AlertTriangle} title="Weaknesses" items={result.gaps} colorClass="border-rose-100 bg-rose-50/30 text-rose-800" />
      <DashboardBlock icon={MessageSquareText} title="Improvement suggestions" items={result.recommendations} colorClass="border-indigo-100 bg-indigo-50/30 text-indigo-800" />
    </div>
  );
}

function DashboardBlock({ icon: Icon, title, items, colorClass }: { icon: LucideIcon; title: string; items: string[]; colorClass: string }) {
  return (
    <div className={`min-w-0 rounded-2xl border p-4 shadow-sm ${colorClass}`}>
      <div className="mb-3 flex items-center gap-2 font-black">
        <Icon size={16} />
        <h2 className="text-sm">{title}</h2>
      </div>
      <div className="grid gap-2">
        {items.map((item) => (
          <div key={item} className="break-words rounded-lg bg-white/70 p-2.5 text-xs font-semibold leading-5 text-slate-700 border border-slate-100 shadow-sm">{item}</div>
        ))}
      </div>
    </div>
  );
}

function RankTable({ ranks, selected }: { ranks: ReturnType<typeof rankStudents>; selected: Student }) {
  return (
    <FeatureCard icon={BarChart3} title="Batch Rank analysis">
      <div className="space-y-2">
        {ranks.map((entry) => (
          <div
            key={entry.student.roll}
            className={`rounded-xl border p-4 transition-all duration-300 shadow-sm ${
              entry.student.roll === selected.roll
                ? "border-indigo-500 bg-indigo-50/60 shadow"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex justify-between gap-3 items-center">
              <p className="min-w-0 break-words text-sm font-black text-slate-800">#{entry.rank} {entry.student.name}</p>
              <p className="text-sm font-black text-indigo-600">{entry.result.score}/100</p>
            </div>
            <p className="mt-1 text-xs text-slate-400">{entry.student.roll}</p>
          </div>
        ))}
      </div>
    </FeatureCard>
  );
}

function ReportPreview({ student, result, omr }: { student: Student; result: EvaluationResult; omr: CustomOmrResult }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white border border-slate-200 p-4 text-slate-800 sm:p-6 shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">PrepForge Student Report</p>
          <h2 className="mt-2 text-2.5xl font-black text-slate-900">{student.name}</h2>
          <p className="text-xs text-slate-450 mt-1 font-bold">{student.roll} &bull; {student.stream} &bull; {student.subject}</p>
        </div>
        <div className="rounded-xl bg-slate-900 px-5 py-4 text-left text-white sm:text-right shadow">
          <p className="text-2.5xl font-black">{result.score}/100</p>
          <p className="text-xs text-slate-400 mt-1">OMR {omr.score}/{omr.total}</p>
        </div>
      </div>
      <p className="mt-5 text-sm leading-7 text-slate-650">{result.summary}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <ReportList title="Strengths" items={result.strengths} />
        <ReportList title="Weaknesses" items={result.gaps} />
        <ReportList title="Suggestions" items={result.recommendations} />
      </div>
    </div>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-150 p-4">
      <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-700">{title}</p>
      {items.map((item) => <p key={item} className="text-xs leading-5 text-slate-500 font-semibold mb-1.5">- {item}</p>)}
    </div>
  );
}

function statusColor(status: string) {
  if (status === "correct") return "border-emerald-500 bg-emerald-50 text-emerald-700 font-black";
  if (status === "wrong") return "border-rose-500 bg-rose-50 text-rose-700 font-black";
  return "border-amber-500 bg-amber-50 text-amber-700 font-black";
}

function buildReportHtml(student: Student, result: EvaluationResult, omr: CustomOmrResult) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${student.roll} PrepForge Report</title><style>body{font-family:Arial,sans-serif;margin:40px;color:#0f172a;background-color:#faf9fc;padding:24px}.score{float:right;background:#0f172a;color:white;padding:16px 20px;border-radius:12px}.card{border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:14px 0;background:white;box-shadow:0 4px 12px rgba(0,0,0,0.01)}.badge{display:inline-block;margin:4px;padding:5px 8px;border-radius:999px;background:#e0f2fe;color:#075985;font-size:12px}.reasoning{margin:8px 0;padding:8px 12px;background:#f8fafc;border-left:4px solid #6366f1;font-size:12px;color:#475569}</style></head><body><div class="score"><b>${result.score}/100</b><br>OMR ${omr.score}/${omr.total}</div><h1>PrepForge Evaluation Report</h1><p>${student.name} | ${student.roll} | ${student.stream}</p><div class="card"><b>Summary</b><p>${result.summary}</p></div><div class="card"><b>Step Marks</b>${result.stepGrades.map((grade) => `<p><b>${grade.topic}</b>: ${grade.awarded}/${grade.max} - ${grade.note}</p>${grade.reasoning ? `<div class="reasoning"><b>Grading Reasoning:</b> ${grade.reasoning}</div>` : ""}${grade.citations.map((citation) => `<span class="badge">${citation.source}, line ${citation.line}: "${citation.excerpt}"</span>`).join("")}`).join("")}</div><div class="card"><b>OMR Check</b><p>Correct: ${omr.correct}, Wrong: ${omr.wrong}, Blank: ${omr.blank}, Accuracy: ${omr.accuracy}%</p></div><div class="card"><b>Improvement Recommendations</b>${result.recommendations.map((item) => `<p>&bull; ${item}</p>`).join("")}</div></body></html>`;
}

function formatClientError(prefix: string, error: unknown) {
  if (error instanceof Error) {
    return `${prefix}: ${error.message}`;
  }
  return `${prefix}: ${String(error)}`;
}
