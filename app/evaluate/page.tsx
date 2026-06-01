"use client";

import { useMemo, useState } from "react";
import type { ElementType } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Brain,
  Check,
  ChevronRight,
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

type StepId = "login" | "answers" | "model" | "marks" | "feedback" | "omr" | "report";
type Stream = "JEE" | "NEET";

type UploadedFile = {
  name: string;
  size: number;
  type: string;
};

type Student = {
  name: string;
  roll: string;
  stream: Stream;
  score: number;
  total: number;
  accuracy: number;
  rank: number;
  strengths: string[];
  gaps: string[];
  suggestions: string[];
  omr: string[];
  correct: boolean[];
};

const steps: { id: StepId; label: string; icon: ElementType; accent: string }[] = [
  { id: "login", label: "Faculty Login", icon: Lock, accent: "#2DD4BF" },
  { id: "answers", label: "Upload Answer Sheet", icon: Upload, accent: "#38BDF8" },
  { id: "model", label: "Upload Model Answer", icon: FileText, accent: "#F472B6" },
  { id: "marks", label: "AI Marks Generate", icon: Brain, accent: "#A78BFA" },
  { id: "feedback", label: "Feedback Generate", icon: MessageSquareText, accent: "#4ADE80" },
  { id: "omr", label: "OMR Checking", icon: ScanLine, accent: "#FBBF24" },
  { id: "report", label: "Student Report PDF", icon: FileBadge, accent: "#FB7185" },
];

const students: Student[] = [
  {
    name: "Aarav Sharma",
    roll: "JEE-2026-014",
    stream: "JEE",
    score: 87,
    total: 100,
    accuracy: 87,
    rank: 1,
    strengths: ["Calculus", "Mechanics", "Electrochemistry"],
    gaps: ["Ray optics", "Aromatic substitution"],
    suggestions: ["Revise sign convention in optics.", "Practice 15 organic mechanism MCQs daily.", "Show formula substitution before final answer."],
    omr: ["A", "B", "C", "D", "B", "A", "C", "D", "A", "B"],
    correct: [true, true, false, true, true, true, false, true, true, false],
  },
  {
    name: "Meera Iyer",
    roll: "NEET-2026-021",
    stream: "NEET",
    score: 74,
    total: 100,
    accuracy: 74,
    rank: 2,
    strengths: ["Human physiology", "Modern physics"],
    gaps: ["Plant kingdom", "Chemical kinetics"],
    suggestions: ["Use NCERT diagrams for Botany revision.", "Create a kinetics formula sheet.", "Attempt mixed Biology PYQs twice a week."],
    omr: ["C", "B", "C", "A", "D", "A", "B", "D", "A", "C"],
    correct: [true, false, true, true, true, false, true, true, false, true],
  },
  {
    name: "Kabir Khan",
    roll: "JEE-2026-033",
    stream: "JEE",
    score: 62,
    total: 100,
    accuracy: 62,
    rank: 3,
    strengths: ["Inorganic chemistry", "Algebra"],
    gaps: ["Rotational dynamics", "Definite integration", "Magnetism"],
    suggestions: ["Break long derivations into labelled steps.", "Revise torque and angular momentum.", "Solve 10 definite integration problems daily."],
    omr: ["B", "B", "A", "D", "C", "A", "C", "B", "A", "D"],
    correct: [false, true, false, true, false, true, true, false, true, false],
  },
];

const answerKey = ["A", "B", "C", "D", "B", "A", "C", "D", "A", "B"];

function formatBytes(size: number) {
  if (size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export default function EvaluatePage() {
  const { user } = useUser();
  const [step, setStep] = useState<StepId>("login");
  const [stream, setStream] = useState<Stream>("JEE");
  const [answerFiles, setAnswerFiles] = useState<UploadedFile[]>([]);
  const [modelFiles, setModelFiles] = useState<UploadedFile[]>([]);
  const [omrFiles, setOmrFiles] = useState<UploadedFile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState(students[0]);
  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState<"marks" | "feedback" | "omr" | "report" | null>(null);
  const [omrDone, setOmrDone] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  const completed = useMemo(() => {
    const done: StepId[] = ["login"];
    if (answerFiles.length) done.push("answers");
    if (modelFiles.length) done.push("model");
    if (marks) done.push("marks");
    if (feedback) done.push("feedback");
    if (omrDone) done.push("omr");
    if (reportDone) done.push("report");
    return done;
  }, [answerFiles.length, feedback, marks, modelFiles.length, omrDone, reportDone]);

  const activeStepIndex = steps.findIndex((item) => item.id === step);

  const addFiles = (files: FileList | null, setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>) => {
    if (!files) return;
    const next = Array.from(files).map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type || "file",
    }));
    setter((prev) => [...prev, ...next]);
  };

  const askGemini = async (mode: "marks" | "feedback") => {
    setLoading(mode);
    const prompt =
      mode === "marks"
        ? `Generate a ${stream} faculty marks evaluation for ${selectedStudent.name}. Use answer sheets: ${answerFiles.map((file) => file.name).join(", ") || "demo answer sheet"} and model answers: ${modelFiles.map((file) => file.name).join(", ") || "demo model answer"}. Return marks, confidence, evidence, and review warnings.`
        : `Generate detailed ${stream} student feedback for ${selectedStudent.name}. Score: ${selectedStudent.score}/${selectedStudent.total}. Strengths: ${selectedStudent.strengths.join(", ")}. Gaps: ${selectedStudent.gaps.join(", ")}. Keep it grounded in answer sheet evidence and model answer rubric.`;

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, mode }),
      });
      const data = await res.json();
      const fallback =
        mode === "marks"
          ? `${selectedStudent.name}: ${selectedStudent.score}/${selectedStudent.total}. Confidence 0.86. Evidence matched against uploaded answer sheet and model answer. Faculty review recommended for two low-confidence derivation steps.`
          : `${selectedStudent.name} is strong in ${selectedStudent.strengths.join(", ")}. Improve ${selectedStudent.gaps.join(", ")}. Next plan: ${selectedStudent.suggestions.join(" ")}`;

      if (mode === "marks") setMarks(data.text || fallback);
      if (mode === "feedback") setFeedback(data.text || fallback);
    } catch {
      if (mode === "marks") {
        setMarks(`${selectedStudent.name}: ${selectedStudent.score}/${selectedStudent.total}. Confidence 0.86. Static demo fallback used because Gemini is not configured locally.`);
      } else {
        setFeedback(`${selectedStudent.name} should focus on ${selectedStudent.gaps.join(", ")}. Static demo fallback used because Gemini is not configured locally.`);
      }
    } finally {
      setLoading(null);
    }
  };

  const runOmr = () => {
    setLoading("omr");
    window.setTimeout(() => {
      setOmrDone(true);
      setLoading(null);
    }, 900);
  };

  const exportReport = () => {
    setLoading("report");
    window.setTimeout(() => {
      setReportDone(true);
      setLoading(null);
    }, 800);
  };

  const nextStep = () => {
    const next = steps[Math.min(activeStepIndex + 1, steps.length - 1)]?.id;
    if (next) setStep(next);
  };

  return (
    <div className="min-h-screen bg-[#05070A] text-[#F6F7FB]">
      <SignedOut>
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#09110F] p-8 text-center shadow-2xl">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-300 text-[#04100E]">
              <Lock size={25} />
            </div>
            <h1 className="text-2xl font-black text-white">Faculty Login</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Sign in with Clerk to open the static JEE/NEET evaluation demo.
            </p>
            <SignInButton mode="modal">
              <button className="mt-7 w-full rounded-xl bg-teal-300 px-5 py-3 text-sm font-black text-[#04100E] transition hover:bg-teal-200">
                Continue with Clerk
              </button>
            </SignInButton>
            <Link href="/" className="mt-4 inline-block text-xs font-bold uppercase tracking-[0.18em] text-slate-500 hover:text-white">
              Back home
            </Link>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
          <aside className="border-r border-white/10 bg-[#07100F] px-4 py-5">
            <Link href="/" className="mb-6 flex items-center gap-3 px-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-300 text-[#04100E]">
                <Brain size={19} />
              </div>
              <span className="text-lg font-black text-white">Prep<span className="text-teal-200">Forge</span></span>
            </Link>

            <div className="mb-5 rounded-2xl border border-teal-300/15 bg-teal-300/8 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={14} className="text-teal-200" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-200">Faculty Console</p>
              </div>
              <p className="text-xs leading-5 text-slate-400">
                Static demo now. Database, OCR, and bulk reports can be added after college feedback.
              </p>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2">
              {(["JEE", "NEET"] as Stream[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setStream(item)}
                  className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                    stream === item
                      ? "border-teal-300/50 bg-teal-300/15 text-teal-100"
                      : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <nav className="space-y-2">
              {steps.map((item, index) => {
                const Icon = item.icon;
                const active = item.id === step;
                const done = completed.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => setStep(item.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                      active
                        ? "border-teal-300/30 bg-teal-300/10 text-white"
                        : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.03] hover:text-white"
                    }`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#0B1514]">
                      {done ? <Check size={15} className="text-emerald-300" /> : <Icon size={15} style={{ color: item.accent }} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black">{item.label}</p>
                      <p className="text-[10px] text-slate-600">Step {index + 1} of 7</p>
                    </div>
                    {active && <ChevronRight size={14} className="text-teal-200" />}
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="min-w-0">
            <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#05070A]/85 px-5 py-4 backdrop-blur-xl md:px-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-teal-200">{stream} Evaluation Demo</p>
                <h1 className="mt-1 text-xl font-black text-white">{steps[activeStepIndex].label}</h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-bold text-white">{user?.fullName || "Faculty"}</p>
                  <p className="text-[10px] text-slate-500">Clerk authenticated</p>
                </div>
                <UserButton />
              </div>
            </header>

            <div className="mx-auto max-w-6xl px-5 py-7 md:px-8">
              <div className="mb-7 grid gap-3 md:grid-cols-4">
                {[
                  ["Answer sheets", answerFiles.length || "0"],
                  ["Model answers", modelFiles.length || "0"],
                  ["AI confidence", marks ? "86%" : "--"],
                  ["Reports", reportDone ? "Ready" : "Draft"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <p className="text-2xl font-black text-white">{value}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
                  </div>
                ))}
              </div>

              <section className="rounded-3xl border border-white/10 bg-[#08100F] p-5 shadow-2xl md:p-7">
                {step === "login" && (
                  <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                    <PanelTitle icon={ShieldCheck} title="Faculty Login" text="Clerk is wired for the real auth layer. This page is protected, and the demo keeps data static for now." />
                    <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/8 p-5">
                      <BadgeCheck className="mb-4 text-emerald-200" size={28} />
                      <p className="text-lg font-black text-white">Authenticated</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {user?.primaryEmailAddress?.emailAddress || "Faculty account"} can run the full evaluation flow.
                      </p>
                      <button onClick={nextStep} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-300 px-5 py-3 text-sm font-black text-[#04100E]">
                        Start Uploads <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {step === "answers" && (
                  <UploadStep
                    title="Upload Answer Sheet"
                    description="Add scanned student answer sheets. Files stay in browser state for this demo."
                    files={answerFiles}
                    onAdd={(files) => addFiles(files, setAnswerFiles)}
                    onRemove={(index) => setAnswerFiles((prev) => prev.filter((_, i) => i !== index))}
                    accent="#38BDF8"
                    inputId="answer-upload"
                  />
                )}

                {step === "model" && (
                  <UploadStep
                    title="Upload Model Answer"
                    description="Add the marking scheme, answer key, or rubric that Gemini should use as grounding context."
                    files={modelFiles}
                    onAdd={(files) => addFiles(files, setModelFiles)}
                    onRemove={(index) => setModelFiles((prev) => prev.filter((_, i) => i !== index))}
                    accent="#F472B6"
                    inputId="model-upload"
                  />
                )}

                {step === "marks" && (
                  <ActionPanel
                    icon={Brain}
                    title="AI Marks Generate"
                    text="Generate marks with a constrained RAG prompt using uploaded answer sheets, model answers, and rubric context."
                    button="Generate AI Marks"
                    loading={loading === "marks"}
                    result={marks}
                    onRun={() => askGemini("marks")}
                    accent="#A78BFA"
                  />
                )}

                {step === "feedback" && (
                  <ActionPanel
                    icon={MessageSquareText}
                    title="Feedback Generate"
                    text="Create student-friendly feedback with strengths, gaps, and next practice actions for JEE or NEET."
                    button="Generate Feedback"
                    loading={loading === "feedback"}
                    result={feedback}
                    onRun={() => askGemini("feedback")}
                    accent="#4ADE80"
                  />
                )}

                {step === "omr" && (
                  <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
                    <div>
                      <PanelTitle icon={ScanLine} title="OMR Checking" text="Upload OMR sheets and run the static optical checking demo." />
                      <UploadDrop inputId="omr-upload" accent="#FBBF24" onAdd={(files) => addFiles(files, setOmrFiles)} />
                      <FileList files={omrFiles} accent="#FBBF24" onRemove={(index) => setOmrFiles((prev) => prev.filter((_, i) => i !== index))} />
                      <button
                        onClick={runOmr}
                        disabled={loading === "omr"}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FBBF24] px-5 py-3 text-sm font-black text-[#1A1202] disabled:opacity-60"
                      >
                        {loading === "omr" ? <Loader2 className="animate-spin" size={16} /> : <ScanLine size={16} />}
                        Run OMR Checking
                      </button>
                    </div>
                    <OmrResult student={selectedStudent} done={omrDone} />
                  </div>
                )}

                {step === "report" && (
                  <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                    <ReportPreview student={selectedStudent} marks={marks} feedback={feedback} reportDone={reportDone} />
                    <div>
                      <PanelTitle icon={FileBadge} title="Student Report PDF" text="Preview a PDF-ready report for the selected student. Real PDF export can be added next." />
                      <StudentPicker selected={selectedStudent} onSelect={setSelectedStudent} />
                      <button
                        onClick={exportReport}
                        disabled={loading === "report"}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-300 px-5 py-3 text-sm font-black text-[#160509] disabled:opacity-60"
                      >
                        {loading === "report" ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                        Generate Report PDF
                      </button>
                    </div>
                  </div>
                )}
              </section>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_340px]">
                <RagTrace active={step} />
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                  <p className="text-sm font-black text-white">Student</p>
                  <StudentPicker selected={selectedStudent} onSelect={setSelectedStudent} />
                  <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/8 p-4">
                    <div className="mb-2 flex items-center gap-2 text-amber-200">
                      <AlertTriangle size={15} />
                      <p className="text-xs font-black">Secret note</p>
                    </div>
                    <p className="text-xs leading-5 text-slate-400">
                      API keys should stay in local environment variables. They are not committed to the repo.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-7 flex flex-col justify-between gap-3 border-t border-white/10 pt-5 sm:flex-row">
                <button
                  onClick={() => setStep(steps[Math.max(0, activeStepIndex - 1)].id)}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-300 transition hover:text-white"
                >
                  Back
                </button>
                <button
                  onClick={nextStep}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-300 px-5 py-3 text-sm font-black text-[#04100E]"
                >
                  Next Step <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </main>
        </div>
      </SignedIn>
    </div>
  );
}

function PanelTitle({ icon: Icon, title, text }: { icon: ElementType; title: string; text: string }) {
  return (
    <div>
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-300/12 text-teal-200">
        <Icon size={23} />
      </div>
      <h2 className="text-2xl font-black text-white">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}

function UploadStep(props: {
  title: string;
  description: string;
  files: UploadedFile[];
  onAdd: (files: FileList | null) => void;
  onRemove: (index: number) => void;
  accent: string;
  inputId: string;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div>
        <PanelTitle icon={Upload} title={props.title} text={props.description} />
        <UploadDrop inputId={props.inputId} accent={props.accent} onAdd={props.onAdd} />
      </div>
      <div>
        <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">Uploaded files</p>
        <FileList files={props.files} accent={props.accent} onRemove={props.onRemove} />
      </div>
    </div>
  );
}

function UploadDrop({ inputId, accent, onAdd }: { inputId: string; accent: string; onAdd: (files: FileList | null) => void }) {
  return (
    <label
      htmlFor={inputId}
      className="mt-6 block cursor-pointer rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-7 text-center transition hover:border-white/30"
    >
      <input id={inputId} type="file" multiple className="hidden" onChange={(event) => onAdd(event.target.files)} />
      <Upload className="mx-auto mb-3" size={28} style={{ color: accent }} />
      <p className="text-sm font-black text-white">Click to upload files</p>
      <p className="mt-1 text-xs text-slate-500">PDF, JPG, PNG, DOCX supported in demo UI</p>
    </label>
  );
}

function FileList({ files, accent, onRemove }: { files: UploadedFile[]; accent: string; onRemove: (index: number) => void }) {
  if (!files.length) {
    return <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 text-sm text-slate-500">No files uploaded yet.</div>;
  }

  return (
    <div className="space-y-3">
      {files.map((file, index) => (
        <div key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0B1514] p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl text-[10px] font-black" style={{ background: `${accent}20`, color: accent }}>
            {file.name.split(".").pop()?.slice(0, 4).toUpperCase() || "FILE"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{file.name}</p>
            <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
          </div>
          <button onClick={() => onRemove(index)} className="rounded-lg p-2 text-slate-500 hover:bg-white/[0.05] hover:text-rose-300">
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}

function ActionPanel(props: {
  icon: ElementType;
  title: string;
  text: string;
  button: string;
  loading: boolean;
  result: string;
  onRun: () => void;
  accent: string;
}) {
  const Icon = props.icon;
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div>
        <PanelTitle icon={Icon} title={props.title} text={props.text} />
        <button
          onClick={props.onRun}
          disabled={props.loading}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-[#04100E] disabled:opacity-60"
          style={{ background: props.accent }}
        >
          {props.loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
          {props.button}
        </button>
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#0B1514] p-5">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">AI output</p>
        <div className="min-h-56 rounded-2xl border border-white/10 bg-[#050B0A] p-5 text-sm leading-7 text-slate-300">
          {props.loading ? (
            <div className="flex h-44 items-center justify-center gap-3 text-slate-400">
              <Loader2 className="animate-spin" size={18} />
              Running constrained Gemini evaluation...
            </div>
          ) : props.result ? (
            props.result
          ) : (
            "Click generate to create a grounded demo response."
          )}
        </div>
      </div>
    </div>
  );
}

function StudentPicker({ selected, onSelect }: { selected: Student; onSelect: (student: Student) => void }) {
  return (
    <div className="mt-3 grid gap-2">
      {students.map((student) => (
        <button
          key={student.roll}
          onClick={() => onSelect(student)}
          className={`rounded-xl border p-3 text-left transition ${
            selected.roll === student.roll
              ? "border-teal-300/40 bg-teal-300/10"
              : "border-white/10 bg-white/[0.025] hover:bg-white/[0.05]"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-white">{student.name}</p>
            <span className="rounded-lg bg-white/[0.06] px-2 py-1 text-[10px] font-black text-slate-300">{student.stream}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{student.roll}</p>
        </button>
      ))}
    </div>
  );
}

function OmrResult({ student, done }: { student: Student; done: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0B1514] p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-white">{student.name}</p>
          <p className="text-xs text-slate-500">{student.roll}</p>
        </div>
        <span className={`rounded-xl px-3 py-2 text-xs font-black ${done ? "bg-emerald-300/12 text-emerald-200" : "bg-white/[0.05] text-slate-500"}`}>
          {done ? "Checked" : "Waiting"}
        </span>
      </div>
      <div className="grid gap-2">
        {student.omr.map((answer, index) => (
          <div key={index} className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.025] p-2">
            <span className="w-9 text-xs font-black text-slate-500">Q{index + 1}</span>
            {["A", "B", "C", "D"].map((option) => {
              const selected = answer === option;
              const shouldBe = answerKey[index] === option;
              return (
                <span
                  key={option}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-black ${
                    done && selected && student.correct[index]
                      ? "border-emerald-300/60 bg-emerald-300/15 text-emerald-200"
                      : done && selected
                        ? "border-rose-300/60 bg-rose-300/15 text-rose-200"
                        : done && shouldBe
                          ? "border-emerald-300/20 bg-emerald-300/8 text-emerald-200/70"
                          : "border-white/10 text-slate-600"
                  }`}
                >
                  {option}
                </span>
              );
            })}
            <span className={`ml-auto text-xs font-black ${done ? (student.correct[index] ? "text-emerald-200" : "text-rose-200") : "text-slate-600"}`}>
              {done ? (student.correct[index] ? "+4" : "-1") : "--"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportPreview({ student, marks, feedback, reportDone }: { student: Student; marks: string; feedback: string; reportDone: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#F8FAFC] p-6 text-slate-950">
      <div className="flex items-start justify-between border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">PrepForge Student Report</p>
          <h2 className="mt-2 text-2xl font-black">{student.name}</h2>
          <p className="text-sm text-slate-500">{student.roll} - {student.stream}</p>
        </div>
        <div className="rounded-2xl bg-slate-950 px-4 py-3 text-right text-white">
          <p className="text-2xl font-black">{student.score}/{student.total}</p>
          <p className="text-xs text-slate-400">Final marks</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[["Accuracy", `${student.accuracy}%`], ["Class Rank", `#${student.rank}`], ["Status", reportDone ? "PDF Ready" : "Draft"]].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-slate-100 p-4">
            <p className="text-lg font-black">{value}</p>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <ReportBlock title="Strengths" items={student.strengths} />
        <ReportBlock title="Topic Gaps" items={student.gaps} />
      </div>
      <div className="mt-5 rounded-xl bg-slate-100 p-4">
        <p className="text-sm font-black">AI Marks Summary</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{marks || "Generate AI marks to fill this section."}</p>
      </div>
      <div className="mt-4 rounded-xl bg-slate-100 p-4">
        <p className="text-sm font-black">Feedback</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{feedback || student.suggestions.join(" ")}</p>
      </div>
    </div>
  );
}

function ReportBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl bg-slate-100 p-4">
      <p className="mb-3 text-sm font-black">{title}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm text-slate-700">
            <Check size={14} className="text-teal-700" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function RagTrace({ active }: { active: StepId }) {
  const logs = [
    ["INGEST", "Answer sheets normalized and chunked for retrieval."],
    ["BM25", "Keyword matches checked against model answer terms."],
    ["VECTOR", "Semantic similarity scored for answer evidence."],
    ["RERANK", "Top evidence snippets selected for Gemini prompt."],
    ["CONFIDENCE", "Low-confidence claims flagged for faculty review."],
    ["OUTPUT", "Marks, feedback, OMR, and PDF report assembled."],
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 size={17} className="text-teal-200" />
        <p className="text-sm font-black text-white">RAG Observability Trace</p>
        <span className="ml-auto rounded-lg bg-white/[0.06] px-2 py-1 text-[10px] font-black uppercase text-slate-400">{active}</span>
      </div>
      <div className="grid gap-2">
        {logs.map(([label, text]) => (
          <div key={label} className="flex gap-3 rounded-xl border border-white/8 bg-[#07100F] p-3">
            <span className="w-24 shrink-0 text-[10px] font-black uppercase tracking-[0.16em] text-teal-200">{label}</span>
            <p className="text-xs leading-5 text-slate-400">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
