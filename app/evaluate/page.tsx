"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
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

type Workspace = "descriptive" | "omr" | "insights" | "report" | "history";

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
  const [omrFileRefs, setOmrFileRefs] = useState<File[]>([]);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [omrKeyText, setOmrKeyText] = useState(answerKey.join(" "));
  const [omrResponseText, setOmrResponseText] = useState(selectedStudent.omr.join(" "));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResult>(() => evaluateLocally(selectedStudent));
  const [omrResult, setOmrResult] = useState<CustomOmrResult>(() => evaluateCustomOmr(answerKey.join(" "), selectedStudent.omr.join(" ")));
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/evaluations");
      if (res.ok) {
        const data = await res.json();
        setHistoryItems(data.records || []);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
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
        setStatusNote("Failed to delete history item.");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      setStatusNote("An error occurred while deleting the history item.");
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
        setStatusNote("Failed to clear history.");
      }
    } catch (error) {
      console.error("Failed to clear history:", error);
      setStatusNote("An error occurred while clearing history.");
    }
  };

  const loadHistoryItem = (item: any) => {
    if (item.type === "descriptive") {
      const student = item.resultJson.student || {
        name: item.title.replace(/\s*\(NEET\)|\s*\(JEE\)/g, ""),
        roll: item.subtitle.split(" - Roll: ").pop() || "",
        stream: item.title.includes("NEET") ? "NEET" : "JEE",
        subject: item.subtitle.split(" - Roll: ")[0] || "",
        answerText: item.resultJson.answerText || "",
        omr: [],
      };
      setSelectedRoll(student.roll);
      setAnswerText(item.resultJson.answerText || "");
      setMarkingCriteria(item.resultJson.rubricText || criteriaText);
      setResult(item.resultJson);
      setStatusNote(`Loaded descriptive evaluation for ${student.name} from history.`);
      setWorkspace("insights");
    } else {
      setOmrKeyText(item.resultJson.answerKey || "");
      setOmrResponseText(item.resultJson.responses || "");
      setOmrResult(item.resultJson);
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
    try {
      const local = evaluateLocally(selectedStudent, `${answerText}\n${markingCriteria}`);
      setResult(local);

      const form = new FormData();
      form.append("student", JSON.stringify(selectedStudent));
      form.append("answerText", answerText);
      form.append("rubricText", markingCriteria);
      answerFileRefs.forEach((file) => form.append("answerFiles", file));

      const res = await fetch("/api/evaluate", { method: "POST", body: form });
      const data = (await res.json()) as EvaluationResult & { warning?: string; error?: string };
      if (!res.ok) {
        setStatusNote(data.error || "Evaluation failed. Showing local fallback.");
        return;
      }
      setResult(data);
      if (data.warning) setStatusNote(data.warning);
      else if (answerFileRefs.length) setStatusNote("Answer sheet processed with Gemini Vision OCR + AI grading.");
      else setStatusNote("AI grading complete (Gemini).");
      fetchHistory();
      setWorkspace("insights");
    } catch (err: any) {
      console.error(err);
      setStatusNote("Network request failed. Loaded local grading metrics instead.");
    } finally {
      setLoading(false);
    }
  };

  const runOmr = async () => {
    setLoading(true);
    setStatusNote(null);
    try {
      const form = new FormData();
      form.append("answerKey", omrKeyText);
      form.append("responses", omrResponseText);
      omrFileRefs.forEach((file) => form.append("omrFiles", file));

      const res = await fetch("/api/omr", { method: "POST", body: form });
      const data = (await res.json()) as CustomOmrResult & { error?: string; visionUsed?: boolean; parsedResponses?: string };
      if (!res.ok) {
        setOmrResult(evaluateCustomOmr(omrKeyText, omrResponseText));
        setStatusNote(data.error || "OMR API failed. Used manual text fallback.");
        setWorkspace("omr");
        return;
      }
      if (data.parsedResponses) setOmrResponseText(data.parsedResponses);
      setOmrResult(data);
      setStatusNote(data.visionUsed ? "OMR sheet read with Gemini Vision." : "OMR scored from text responses.");
      fetchHistory();
      setWorkspace("omr");
    } catch (err: any) {
      console.error(err);
      setOmrResult(evaluateCustomOmr(omrKeyText, omrResponseText));
      setStatusNote("Network request failed. Scored OMR locally using response text.");
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
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit
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
    <main className="min-h-screen bg-[#05070B] text-white">
      <header className="border-b border-white/10 bg-[#080A10] px-5 py-4 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-300 text-slate-950">
              <Brain size={20} />
            </span>
            <span className="text-lg font-black">Prep<span className="text-teal-300">Forge</span></span>
          </Link>
          <div className="hidden sm:flex gap-2">
            {(["JEE", "NEET"] as Stream[]).map((item) => (
              <button key={item} onClick={() => selectStream(item)} className={`rounded-xl border px-4 py-2 text-xs font-black ${stream === item ? "border-teal-300 bg-teal-300 text-slate-950" : "border-white/10 text-slate-400"}`}>
                {item}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-7 md:px-8 lg:grid-cols-[300px_1fr]">
        
        {/* Mobile Viewports: Selectors and Horizontal Tabs */}
        <div className="lg:hidden space-y-4">
          {statusNote && (
            <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">
              {statusNote}
            </div>
          )}
          
          <div className="grid gap-3 grid-cols-2">
            {/* Student Dropdown Picker */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Select Student</label>
              <select
                value={selectedRoll}
                onChange={(e) => {
                  const student = students.find((s) => s.roll === e.target.value);
                  if (student) selectStudent(student);
                }}
                className="w-full bg-[#0E121A] text-white border border-white/10 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-teal-300"
              >
                {students.filter((s) => s.stream === stream).map((s) => (
                  <option key={s.roll} value={s.roll}>
                    {s.name} ({s.roll})
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile Stream Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Stream Focus</label>
              <div className="flex rounded-xl border border-white/10 bg-[#0E121A] p-1 h-[38px]">
                {(["JEE", "NEET"] as Stream[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => selectStream(item)}
                    className={`flex-1 rounded-lg text-xs font-black transition-all ${
                      stream === item
                        ? "bg-teal-300 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Horizontal Scrolling Navigation */}
          <div className="border-b border-white/5 pb-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Workspace View</label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
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
                      ? "border-teal-300 bg-teal-300/10 text-white"
                      : "border-white/10 bg-black/25 text-slate-400"
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
          <Panel icon={ShieldCheck} title="Faculty Evaluation" text="Powered by free Gemini API: Vision OCR for answer sheets & OMR, RAG rubric grading, structured marks and feedback. Add GEMINI_API_KEY in .env to enable." />
          {statusNote && (
            <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">
              {statusNote}
            </div>
          )}
          <StudentPicker stream={stream} selected={selectedStudent} onSelect={selectStudent} />
          <nav className="grid gap-2">
            {[
              ["descriptive", "Descriptive Answers", Brain],
              ["omr", "OMR Evaluation", ScanLine],
              ["insights", "Gaps and Patterns", BarChart3],
              ["report", "Reports", FileBadge],
              ["history", "Evaluation History", History],
            ].map(([id, label, Icon]) => (
              <button key={id as string} onClick={() => setWorkspace(id as Workspace)} className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm font-bold ${workspace === id ? "border-teal-300 bg-teal-300/10 text-white" : "border-white/10 bg-black/25 text-slate-400"}`}>
                <Icon size={16} />
                {label as string}
              </button>
            ))}
          </nav>
        </aside>

        <section className="space-y-6">
          <Metrics result={result} omr={omrResult} files={answerFiles.length + criteriaFiles.length + omrFiles.length} />

          {workspace === "descriptive" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <FeatureCard icon={Upload} title="Scanned answer sheets or images">
                <UploadDrop inputId="answer-files" onAdd={(files) => addFiles(files, setAnswerFiles, setAnswerFileRefs)} />
                <FileList files={answerFiles} onRemove={(index) => { setAnswerFiles((prev) => prev.filter((_, i) => i !== index)); setAnswerFileRefs((prev) => prev.filter((_, i) => i !== index)); }} />
                <Editor label="OCR transcript / typed answer" value={answerText} onChange={setAnswerText} minHeight="min-h-[250px]" />
              </FeatureCard>
              <FeatureCard icon={FileText} title="Predefined marking criteria">
                <UploadDrop inputId="criteria-files" onAdd={(files) => addFiles(files, setCriteriaFiles)} />
                <FileList files={criteriaFiles} onRemove={(index) => setCriteriaFiles((prev) => prev.filter((_, i) => i !== index))} />
                <Editor label="Rubric and step marking rules" value={markingCriteria} onChange={setMarkingCriteria} minHeight="min-h-[250px]" />
                <button onClick={runDescriptive} disabled={loading} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-60">
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
                <button onClick={runOmr} disabled={loading} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-60">
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
                <button onClick={downloadReport} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-300 px-5 py-3 text-sm font-black text-slate-950">
                  <Download size={16} />
                  Download Report
                </button>
              </FeatureCard>
            </div>
          )}

          {workspace === "history" && (
            <FeatureCard icon={History} title="Evaluation History Log">
              <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
                <p className="text-xs text-slate-400">
                  Recent descriptive and OMR grading sessions stored in the workspace history.
                </p>
                {historyItems.length > 0 && (
                  <button onClick={clearHistory} className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/25">
                    Clear All History
                  </button>
                )}
              </div>

              {loadingHistory ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="animate-spin text-teal-300" size={24} />
                </div>
              ) : historyItems.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/25 p-8 text-center text-slate-500">
                  No evaluation history found. Run descriptive or OMR grading to save records.
                </div>
              ) : (
                <div className="grid gap-3">
                  {historyItems.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.type === "descriptive" ? "bg-teal-300/10 text-teal-300" : "bg-amber-300/10 text-amber-300"}`}>
                          {item.type === "descriptive" ? <Brain size={18} /> : <ScanLine size={18} />}
                        </span>
                        <div>
                          <p className="font-bold text-sm text-white">{item.title}</p>
                          <p className="mt-1 text-xs text-slate-400">{item.subtitle}</p>
                          <p className="mt-1 text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-black text-teal-300">{item.score}/{item.total}</p>
                          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{item.type}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => loadHistoryItem(item)} className="rounded-lg bg-teal-300 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-teal-200">
                            Load
                          </button>
                          <button onClick={() => deleteItem(item.id, item.type)} className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/35 border border-rose-500/20">
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
    ["Descriptive", `${result.score}/${result.total}`],
    ["OMR", `${omr.score}/${omr.total}`],
    ["Accuracy", `${omr.accuracy}%`],
    ["Uploads", files],
  ];
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {metrics.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-white/10 bg-black/35 p-4">
          <p className="text-2xl font-black text-teal-300">{value}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        </div>
      ))}
    </div>
  );
}

function Panel({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-300/10 text-teal-200">
        <Icon size={20} />
      </div>
      <h2 className="font-black">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 shadow-2xl">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-300/10 text-teal-200">
          <Icon size={18} />
        </span>
        <h2 className="font-black">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function StudentPicker({ stream, selected, onSelect }: { stream: Stream; selected: Student; onSelect: (student: Student) => void }) {
  return (
    <div className="grid gap-2">
      {students.filter((student) => student.stream === stream).map((student) => (
        <button key={student.roll} onClick={() => onSelect(student)} className={`rounded-xl border p-4 text-left ${selected.roll === student.roll ? "border-teal-300 bg-teal-300/10" : "border-white/10 bg-black/25"}`}>
          <p className="font-black">{student.name}</p>
          <p className="mt-1 text-xs text-slate-500">{student.roll} - {student.subject}</p>
        </button>
      ))}
    </div>
  );
}

function UploadDrop({ inputId, onAdd }: { inputId: string; onAdd: (files: FileList | null) => void }) {
  return (
    <label htmlFor={inputId} className="block cursor-pointer rounded-2xl border border-dashed border-white/15 bg-black/25 p-5 text-center hover:border-teal-300/50">
      <input id={inputId} type="file" multiple className="hidden" onChange={(event) => onAdd(event.target.files)} />
      <Upload className="mx-auto mb-2 text-teal-300" size={24} />
      <p className="text-sm font-black">Upload files</p>
      <p className="mt-1 text-xs text-slate-500">Images, PDFs, scans, answer keys, and OMR sheets</p>
    </label>
  );
}

function FileList({ files, onRemove }: { files: UploadedFile[]; onRemove: (index: number) => void }) {
  if (!files.length) return <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-slate-500">No files added yet.</div>;
  return (
    <div className="mt-3 space-y-2">
      {files.map((file, index) => (
        <div key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
          <FileText size={16} className="text-teal-300" />
          <p className="min-w-0 flex-1 truncate text-sm">{file.name}</p>
          <button onClick={() => onRemove(index)} className="text-slate-500 hover:text-rose-300">
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
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className={`${minHeight} w-full rounded-2xl border border-white/10 bg-black/35 p-4 text-sm leading-7 text-slate-200 outline-none focus:border-teal-300/50`} />
    </label>
  );
}

function StepGrades({ result }: { result: EvaluationResult }) {
  return (
    <FeatureCard icon={Brain} title="Step-wise marks with citations">
      <div className="space-y-3">
        {result.stepGrades.map((grade) => (
          <div key={grade.rubricId} className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black">{grade.topic}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{grade.expected}</p>
              </div>
              <span className="rounded-xl bg-teal-300 px-3 py-2 text-xs font-black text-slate-950">{grade.awarded}/{grade.max}</span>
            </div>
            <p className="mt-3 text-sm text-slate-300">{grade.note}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {grade.citations.map((citation) => (
                <span key={citation.id} title={citation.excerpt} className="rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1 text-[11px] font-bold text-sky-200">
                  {citation.source}, line {citation.line}
                </span>
              ))}
            </div>
          </div>
        ))}
        {result.aiText && <div className="rounded-2xl border border-teal-300/20 bg-teal-300/8 p-4 text-sm leading-7 text-slate-200">{result.aiText}</div>}
        {result.warning && <div className="rounded-2xl border border-amber-300/20 bg-amber-300/8 p-4 text-sm leading-7 text-amber-100">{result.warning}</div>}
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
            <div key={label} className="rounded-xl bg-white/[0.04] p-3">
              <p className="text-xl font-black text-teal-300">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-2">
          {result.items.map((item) => (
            <div key={item.question} className="grid grid-cols-[42px_1fr_70px] items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3">
              <span className="text-xs font-black text-slate-500">Q{item.question}</span>
              <div className="flex gap-2">
                {["A", "B", "C", "D"].map((option) => (
                  <span key={option} className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-black ${item.selected === option ? statusColor(item.status) : item.correct === option ? "border-emerald-400/30 text-emerald-200" : "border-white/10 text-slate-600"}`}>
                    {option}
                  </span>
                ))}
              </div>
              <span className="text-right text-xs font-black">{item.status === "anomaly" ? "Review" : item.score > 0 ? `+${item.score}` : item.score}</span>
            </div>
          ))}
        </div>
      </FeatureCard>
      <FeatureCard icon={BarChart3} title="Subject-wise performance">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {result.subjectWise.map((subject) => (
            <div key={subject.subject} className="rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="font-black">{subject.subject}</p>
              <p className="mt-2 text-2xl font-black text-teal-300">{subject.score}/{subject.total}</p>
              <p className="text-xs text-slate-500">{subject.accuracy}% accuracy</p>
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
      <DashboardBlock icon={BadgeCheck} title="Strengths" items={result.strengths} />
      <DashboardBlock icon={AlertTriangle} title="Weaknesses" items={result.gaps} />
      <DashboardBlock icon={MessageSquareText} title="Improvement Suggestions" items={result.recommendations} />
    </div>
  );
}

function DashboardBlock({ icon: Icon, title, items }: { icon: LucideIcon; title: string; items: string[] }) {
  return (
    <FeatureCard icon={Icon} title={title}>
      <div className="grid gap-2">
        {items.map((item) => (
          <div key={item} className="rounded-xl bg-white/[0.04] p-3 text-sm text-slate-300">{item}</div>
        ))}
      </div>
    </FeatureCard>
  );
}

function RankTable({ ranks, selected }: { ranks: ReturnType<typeof rankStudents>; selected: Student }) {
  return (
    <FeatureCard icon={BarChart3} title="Rank analysis">
      <div className="space-y-2">
        {ranks.map((entry) => (
          <div key={entry.student.roll} className={`rounded-xl border p-3 ${entry.student.roll === selected.roll ? "border-teal-300/50 bg-teal-300/10" : "border-white/8 bg-white/[0.025]"}`}>
            <div className="flex justify-between gap-3">
              <p className="text-sm font-black">#{entry.rank} {entry.student.name}</p>
              <p className="text-sm font-black text-teal-300">{entry.result.score}</p>
            </div>
            <p className="mt-1 text-xs text-slate-500">{entry.student.roll}</p>
          </div>
        ))}
      </div>
    </FeatureCard>
  );
}

function ReportPreview({ student, result, omr }: { student: Student; result: EvaluationResult; omr: CustomOmrResult }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-6 text-slate-950">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">PrepForge Student Report</p>
          <h2 className="mt-2 text-2xl font-black">{student.name}</h2>
          <p className="text-sm text-slate-500">{student.roll} - {student.stream} - {student.subject}</p>
        </div>
        <div className="rounded-2xl bg-slate-950 px-5 py-4 text-right text-white">
          <p className="text-2xl font-black">{result.score}/100</p>
          <p className="text-xs text-slate-400">OMR {omr.score}/{omr.total}</p>
        </div>
      </div>
      <p className="mt-5 text-sm leading-6 text-slate-700">{result.summary}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <ReportList title="Strengths" items={result.strengths} />
        <ReportList title="Weaknesses" items={result.gaps} />
        <ReportList title="Suggestions" items={result.recommendations} />
      </div>
    </div>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl bg-slate-100 p-4">
      <p className="mb-2 text-sm font-black">{title}</p>
      {items.map((item) => <p key={item} className="text-sm leading-6 text-slate-700">- {item}</p>)}
    </div>
  );
}

function statusColor(status: string) {
  if (status === "correct") return "border-emerald-400 bg-emerald-400/20 text-emerald-100";
  if (status === "wrong") return "border-rose-400 bg-rose-400/20 text-rose-100";
  return "border-amber-300 bg-amber-300/20 text-amber-100";
}

function buildReportHtml(student: Student, result: EvaluationResult, omr: CustomOmrResult) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${student.roll} PrepForge Report</title><style>body{font-family:Arial,sans-serif;margin:40px;color:#0f172a}.score{float:right;background:#0f172a;color:white;padding:16px 20px;border-radius:12px}.card{border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:14px 0}.badge{display:inline-block;margin:4px;padding:5px 8px;border-radius:999px;background:#e0f2fe;color:#075985;font-size:12px}</style></head><body><div class="score"><b>${result.score}/100</b><br>OMR ${omr.score}/${omr.total}</div><h1>PrepForge Report</h1><p>${student.name} | ${student.roll} | ${student.stream}</p><div class="card"><b>Summary</b><p>${result.summary}</p></div><div class="card"><b>Step Marks</b>${result.stepGrades.map((grade) => `<p>${grade.topic}: ${grade.awarded}/${grade.max} - ${grade.note}</p>${grade.citations.map((citation) => `<span class="badge">${citation.source}, line ${citation.line}</span>`).join("")}`).join("")}</div><div class="card"><b>OMR</b><p>Correct: ${omr.correct}, Wrong: ${omr.wrong}, Blank: ${omr.blank}, Accuracy: ${omr.accuracy}%</p></div><div class="card"><b>Improvement Plan</b>${result.recommendations.map((item) => `<p>${item}</p>`).join("")}</div></body></html>`;
}
