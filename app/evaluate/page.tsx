"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Brain,
  Check,
  Download,
  FileBadge,
  FileText,
  Loader2,
  Lock,
  MessageSquareText,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  evaluateLocally,
  rankStudents,
  students,
  type EvaluationResult,
  type Student,
  type Stream,
  type UploadedFile,
} from "@/lib/evaluation";

type StepId = "login" | "ingest" | "rubric" | "evaluate" | "omr" | "gaps" | "report";

const steps: { id: StepId; label: string }[] = [
  { id: "login", label: "Faculty Login" },
  { id: "ingest", label: "OCR Ingest" },
  { id: "rubric", label: "Rubric RAG" },
  { id: "evaluate", label: "Step Marks" },
  { id: "omr", label: "OMR Check" },
  { id: "gaps", label: "Topic Gaps" },
  { id: "report", label: "Report PDF" },
];

export default function EvaluatePage() {
  const { user } = useUser();
  const [step, setStep] = useState<StepId>("login");
  const [stream, setStream] = useState<Stream>("JEE");
  const filteredStudents = students.filter((student) => student.stream === stream);
  const [selectedRoll, setSelectedRoll] = useState(filteredStudents[0].roll);
  const selectedStudent = students.find((student) => student.roll === selectedRoll && student.stream === stream) || filteredStudents[0];
  const [answerText, setAnswerText] = useState(selectedStudent.answerText);
  const [answerFiles, setAnswerFiles] = useState<UploadedFile[]>([]);
  const [modelFiles, setModelFiles] = useState<UploadedFile[]>([]);
  const [omrFiles, setOmrFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResult>(() => evaluateLocally(selectedStudent));

  const classRanks = useMemo(
    () => rankStudents(students.filter((student) => student.stream === stream).map((student) => ({ student, result: evaluateLocally(student) }))),
    [stream]
  );

  const activeIndex = steps.findIndex((item) => item.id === step);
  const completed = useMemo(() => {
    const done: StepId[] = ["login"];
    if (answerText.trim() || answerFiles.length) done.push("ingest");
    if (modelFiles.length || result.stepGrades.length) done.push("rubric");
    if (result.stepGrades.length) done.push("evaluate");
    if (result.omr.items.length) done.push("omr");
    if (result.gaps.length) done.push("gaps");
    return done;
  }, [answerFiles.length, answerText, modelFiles.length, result]);

  const switchStream = (next: Stream) => {
    const student = students.find((item) => item.stream === next) || students[0];
    setStream(next);
    setSelectedRoll(student.roll);
    setAnswerText(student.answerText);
    setResult(evaluateLocally(student));
  };

  const switchStudent = (student: Student) => {
    setSelectedRoll(student.roll);
    setAnswerText(student.answerText);
    setResult(evaluateLocally(student));
  };

  const runEvaluation = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student: selectedStudent, answerText }),
      });
      const data = (await res.json()) as EvaluationResult;
      setResult(data);
      setStep("evaluate");
    } finally {
      setLoading(false);
    }
  };

  const addFiles = (files: FileList | null, setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>) => {
    if (!files) return;
    setter((prev) => [
      ...prev,
      ...Array.from(files).map((file) => ({ name: file.name, size: file.size, type: file.type || "file" })),
    ]);
  };

  const downloadReport = () => {
    const html = buildReportHtml(selectedStudent, result);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedStudent.roll}-prepforge-report.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#05070B] text-white">
      <SignedOut>
        <div className="flex min-h-screen items-center justify-center bg-[url('/assets/working.jpg')] bg-cover bg-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/75 p-8 text-center shadow-2xl backdrop-blur-xl">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-400/15 text-teal-200">
              <Lock size={24} />
            </div>
            <h1 className="text-2xl font-black">PrepForge Faculty Login</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">Clerk protects the evaluation suite. Sign in to run the no-database AI workflow.</p>
            <SignInButton mode="modal">
              <button className="mt-7 w-full rounded-xl bg-teal-300 px-5 py-3 text-sm font-black text-slate-950">Continue with Clerk</button>
            </SignInButton>
            <Link href="/" className="mt-5 inline-block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Back home
            </Link>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="grid min-h-screen lg:grid-cols-[286px_1fr]">
          <aside className="border-r border-white/10 bg-[#080A10] p-5">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-300 text-slate-950">
                <Brain size={20} />
              </div>
              <span className="text-lg font-black">Prep<span className="text-teal-300">Forge</span></span>
            </Link>

            <div className="mt-7 grid grid-cols-2 gap-2">
              {(["JEE", "NEET"] as Stream[]).map((item) => (
                <button
                  key={item}
                  onClick={() => switchStream(item)}
                  className={`rounded-xl border px-3 py-2 text-xs font-black ${stream === item ? "border-teal-300 bg-teal-300 text-slate-950" : "border-white/10 text-slate-400"}`}
                >
                  {item}
                </button>
              ))}
            </div>

            <nav className="mt-6 space-y-2">
              {steps.map((item, index) => {
                const active = item.id === step;
                const done = completed.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => setStep(item.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition ${active ? "border-teal-300/45 bg-teal-300/10 text-white" : "border-white/5 text-slate-400 hover:bg-white/[0.03]"}`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${done ? "bg-emerald-400/15 text-emerald-200" : "bg-white/5"}`}>
                      {done ? <Check size={14} /> : index + 1}
                    </span>
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/8 p-4">
              <div className="flex items-center gap-2 text-amber-200">
                <AlertTriangle size={15} />
                <p className="text-xs font-black">No database mode</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">Everything runs from local state and deterministic evaluation logic. API keys remain in ignored env files.</p>
            </div>
          </aside>

          <main className="min-w-0">
            <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#05070B]/90 px-5 py-4 backdrop-blur-xl md:px-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-teal-300">{stream} AI Evaluation Suite</p>
                <h1 className="mt-1 text-xl font-black">{steps[activeIndex]?.label}</h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-bold">{user?.fullName || "Faculty"}</p>
                  <p className="text-[10px] text-slate-500">Clerk authenticated</p>
                </div>
                <UserButton />
              </div>
            </header>

            <div className="mx-auto max-w-7xl px-5 py-7 md:px-8">
              <Metrics result={result} files={answerFiles.length + modelFiles.length + omrFiles.length} />

              <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5 shadow-2xl md:p-7">
                {step === "login" && (
                  <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
                    <Panel icon={ShieldCheck} title="Faculty Console Ready" text="Clerk is active, and this branch contains a complete no-DB evaluation pipeline for JEE/NEET demos." />
                    <StudentPicker stream={stream} selected={selectedStudent} onSelect={switchStudent} />
                  </div>
                )}

                {step === "ingest" && (
                  <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
                    <div>
                      <Panel icon={Upload} title="OCR Answer Ingest" text="Upload answer sheets or edit the OCR transcript directly for deterministic local evaluation." />
                      <UploadDrop inputId="answer-files" onAdd={(files) => addFiles(files, setAnswerFiles)} />
                      <FileList files={answerFiles} onRemove={(index) => setAnswerFiles((prev) => prev.filter((_, i) => i !== index))} />
                    </div>
                    <textarea
                      value={answerText}
                      onChange={(event) => setAnswerText(event.target.value)}
                      className="min-h-[320px] rounded-2xl border border-white/10 bg-black/35 p-5 text-sm leading-7 text-slate-200 outline-none focus:border-teal-300/50"
                    />
                  </div>
                )}

                {step === "rubric" && (
                  <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
                    <div>
                      <Panel icon={FileText} title="Hybrid Rubric RAG" text="Model answers are represented as local rubric points, then matched with BM25-like keywords and syllabus topic overlap." />
                      <UploadDrop inputId="model-files" onAdd={(files) => addFiles(files, setModelFiles)} />
                      <FileList files={modelFiles} onRemove={(index) => setModelFiles((prev) => prev.filter((_, i) => i !== index))} />
                    </div>
                    <Trace trace={result.retrievalTrace} />
                  </div>
                )}

                {step === "evaluate" && (
                  <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
                    <div>
                      <Panel icon={Brain} title="Step-Wise AI Marks" text="Run Gemini-guarded evaluation on top of local citation-backed scoring." />
                      <button onClick={runEvaluation} disabled={loading} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-60">
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                        Run Full Evaluation
                      </button>
                    </div>
                    <StepGrades result={result} />
                  </div>
                )}

                {step === "omr" && (
                  <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
                    <div>
                      <Panel icon={ScanLine} title="OMR Verification" text="Bubble answers are checked with positive marking, negative marking, blanks, and anomaly flags." />
                      <UploadDrop inputId="omr-files" onAdd={(files) => addFiles(files, setOmrFiles)} />
                      <FileList files={omrFiles} onRemove={(index) => setOmrFiles((prev) => prev.filter((_, i) => i !== index))} />
                    </div>
                    <OmrGrid result={result} />
                  </div>
                )}

                {step === "gaps" && (
                  <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                    <GapDashboard result={result} />
                    <RankTable ranks={classRanks} selected={selectedStudent} />
                  </div>
                )}

                {step === "report" && (
                  <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                    <ReportPreview student={selectedStudent} result={result} />
                    <div>
                      <Panel icon={FileBadge} title="PDF-Ready Report" text="Download a printable HTML report. Browser print can save it as PDF for submission demos." />
                      <button onClick={downloadReport} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-300 px-5 py-3 text-sm font-black text-slate-950">
                        <Download size={16} />
                        Download Report
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <div className="mt-6 flex justify-between gap-3 border-t border-white/10 pt-5">
                <button onClick={() => setStep(steps[Math.max(0, activeIndex - 1)].id)} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-300">
                  Back
                </button>
                <button onClick={() => setStep(steps[Math.min(steps.length - 1, activeIndex + 1)].id)} className="rounded-xl bg-teal-300 px-5 py-3 text-sm font-black text-slate-950">
                  Next Step
                </button>
              </div>
            </div>
          </main>
        </div>
      </SignedIn>
    </div>
  );
}

function Metrics({ result, files }: { result: EvaluationResult; files: number }) {
  const metrics = [
    ["Score", `${result.score}/${result.total}`],
    ["Confidence", `${Math.round(result.confidence * 100)}%`],
    ["Citations", result.citations.length],
    ["Files", files],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-white/10 bg-black/35 p-4">
          <p className="text-2xl font-black text-teal-300">{value}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        </div>
      ))}
    </div>
  );
}

function Panel({ icon: Icon, title, text }: { icon: typeof Brain; title: string; text: string }) {
  return (
    <div>
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-300/10 text-teal-200">
        <Icon size={21} />
      </div>
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-400">{text}</p>
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
    <label htmlFor={inputId} className="mt-6 block cursor-pointer rounded-2xl border border-dashed border-white/15 bg-black/25 p-6 text-center hover:border-teal-300/50">
      <input id={inputId} type="file" multiple className="hidden" onChange={(event) => onAdd(event.target.files)} />
      <Upload className="mx-auto mb-3 text-teal-300" size={26} />
      <p className="text-sm font-black">Upload files</p>
      <p className="mt-1 text-xs text-slate-500">PDF, JPG, PNG, DOCX supported for demo state</p>
    </label>
  );
}

function FileList({ files, onRemove }: { files: UploadedFile[]; onRemove: (index: number) => void }) {
  if (!files.length) return <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4 text-sm text-slate-500">No files uploaded yet.</div>;
  return (
    <div className="mt-4 space-y-2">
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

function Trace({ trace }: { trace: EvaluationResult["retrievalTrace"] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-5 font-mono">
      <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-teal-300">RAG observability trace</p>
      <div className="space-y-3">
        {trace.map((item) => (
          <div key={item.stage} className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
            <p className="text-[10px] font-black text-teal-300">[{item.stage}]</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepGrades({ result }: { result: EvaluationResult }) {
  return (
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
    </div>
  );
}

function OmrGrid({ result }: { result: EvaluationResult }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-black">OMR score: {result.omr.score}/{result.omr.total}</p>
        <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">{result.omr.anomalies.length} anomalies</span>
      </div>
      <div className="grid gap-2">
        {result.omr.items.map((item) => (
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
    </div>
  );
}

function GapDashboard({ result }: { result: EvaluationResult }) {
  return (
    <div className="grid gap-4">
      <DashboardBlock icon={BadgeCheck} title="Strengths" items={result.strengths} tone="emerald" />
      <DashboardBlock icon={AlertTriangle} title="Topic Gaps" items={result.gaps} tone="amber" />
      <DashboardBlock icon={MessageSquareText} title="NCERT Practice Plan" items={result.recommendations} tone="sky" />
    </div>
  );
}

function DashboardBlock({ icon: Icon, title, items, tone }: { icon: typeof Brain; title: string; items: string[]; tone: "emerald" | "amber" | "sky" }) {
  const color = tone === "emerald" ? "text-emerald-200" : tone === "amber" ? "text-amber-200" : "text-sky-200";
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <div className={`mb-4 flex items-center gap-2 ${color}`}>
        <Icon size={17} />
        <p className="font-black">{title}</p>
      </div>
      <div className="grid gap-2">
        {items.map((item) => (
          <div key={item} className="rounded-xl bg-white/[0.04] p-3 text-sm text-slate-300">{item}</div>
        ))}
      </div>
    </div>
  );
}

function RankTable({ ranks, selected }: { ranks: ReturnType<typeof rankStudents>; selected: Student }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <div className="mb-4 flex items-center gap-2 text-teal-300">
        <BarChart3 size={17} />
        <p className="font-black text-white">Class Rank</p>
      </div>
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
    </div>
  );
}

function ReportPreview({ student, result }: { student: Student; result: EvaluationResult }) {
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
          <p className="text-xs text-slate-400">{Math.round(result.confidence * 100)}% confidence</p>
        </div>
      </div>
      <p className="mt-5 text-sm leading-6 text-slate-700">{result.summary}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ReportList title="Strengths" items={result.strengths} />
        <ReportList title="Gaps" items={result.gaps} />
      </div>
      <ReportList title="Practice Recommendations" items={result.recommendations} />
    </div>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4 rounded-xl bg-slate-100 p-4">
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

function buildReportHtml(student: Student, result: EvaluationResult) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${student.roll} PrepForge Report</title><style>body{font-family:Arial,sans-serif;margin:40px;color:#0f172a}h1{margin-bottom:4px}.score{float:right;background:#0f172a;color:white;padding:16px 20px;border-radius:12px}.card{border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:14px 0}.badge{display:inline-block;margin:4px;padding:5px 8px;border-radius:999px;background:#e0f2fe;color:#075985;font-size:12px}</style></head><body><div class="score"><b>${result.score}/100</b><br>${Math.round(result.confidence * 100)}% confidence</div><h1>PrepForge Report</h1><p>${student.name} | ${student.roll} | ${student.stream}</p><div class="card"><b>Summary</b><p>${result.summary}</p></div><div class="card"><b>Step Marks</b>${result.stepGrades.map((grade) => `<p>${grade.topic}: ${grade.awarded}/${grade.max} - ${grade.note}</p>${grade.citations.map((citation) => `<span class="badge">${citation.source}, line ${citation.line}</span>`).join("")}`).join("")}</div><div class="card"><b>Topic Gaps</b>${result.gaps.map((gap) => `<p>${gap}</p>`).join("")}</div><div class="card"><b>Practice Plan</b>${result.recommendations.map((item) => `<p>${item}</p>`).join("")}</div></body></html>`;
}
