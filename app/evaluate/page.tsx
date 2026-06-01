"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen, LogIn, Upload, FileText, Brain, MessageSquare,
  CheckSquare, Download, ChevronRight, Check, Loader2,
  X, AlertCircle, Eye, EyeOff, ArrowRight, Sparkles,
  BarChart3, Users, TrendingUp, Award, FileCheck,
  Zap, Star, Clock, Target, RefreshCw, Share2,
  ChevronDown, PieChart, BookMarked, GraduationCap,
  ClipboardList, ScanLine, FileBadge, ShieldCheck, Menu
} from "lucide-react";

/* ─── TYPES ─── */
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  preview?: string;
}

interface Student {
  id: string;
  name: string;
  roll: string;
  marks: number;
  total: number;
  grade: string;
  accuracy: number;
  rank: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  topicGaps: { topic: string; score: number }[];
  omrAnswers?: string[];
  omrCorrect?: boolean[];
}

/* ─── MOCK DATA ─── */
const MOCK_STUDENTS: Student[] = [
  {
    id: "1", name: "Arjun Sharma", roll: "2024JEE001",
    marks: 87, total: 100, grade: "A+", accuracy: 87, rank: 1,
    strengths: ["Calculus", "Mechanics", "Thermodynamics"],
    weaknesses: ["Organic Chemistry", "Optics"],
    suggestions: ["Revise SN1/SN2 reaction mechanisms", "Practice lens formula problems", "Solve 10 Organic PYQs daily"],
    topicGaps: [{ topic: "Organic Chem", score: 42 }, { topic: "Optics", score: 58 }, { topic: "Electrochemistry", score: 71 }],
    omrAnswers: ["A", "B", "C", "A", "D", "B", "C", "D", "A", "B"],
    omrCorrect: [true, true, false, true, true, false, true, true, true, false],
  },
  {
    id: "2", name: "Priya Verma", roll: "2024JEE002",
    marks: 74, total: 100, grade: "B+", accuracy: 74, rank: 2,
    strengths: ["Algebra", "Modern Physics"],
    weaknesses: ["Coordinate Geometry", "Waves"],
    suggestions: ["Focus on conic sections", "Practice wave superposition", "Attempt daily 15 MCQs"],
    topicGaps: [{ topic: "Coordinate Geom", score: 38 }, { topic: "Waves", score: 55 }, { topic: "Permutations", score: 60 }],
    omrAnswers: ["A", "C", "C", "B", "D", "B", "A", "D", "A", "C"],
    omrCorrect: [true, false, false, false, true, false, true, true, true, false],
  },
  {
    id: "3", name: "Rahul Nair", roll: "2024JEE003",
    marks: 61, total: 100, grade: "B", accuracy: 61, rank: 3,
    strengths: ["Inorganic Chemistry"],
    weaknesses: ["Integration", "Magnetism", "Rotational Motion"],
    suggestions: ["Practice 20 Integration problems daily", "Revise magnetic field derivations", "Use NCERT for rotational motion base"],
    topicGaps: [{ topic: "Integration", score: 30 }, { topic: "Magnetism", score: 44 }, { topic: "Rotation", score: 50 }],
    omrAnswers: ["B", "B", "A", "A", "C", "B", "D", "C", "B", "B"],
    omrCorrect: [false, true, false, true, false, false, false, true, false, true],
  },
];

const OMR_KEY = ["A", "B", "C", "A", "D", "B", "C", "D", "A", "B"];

/* ─── STEP CONFIG ─── */
const STEPS = [
  { id: 1, label: "Faculty Login", icon: LogIn, color: "#7C6FE0", desc: "Secure faculty portal" },
  { id: 2, label: "Answer Sheets", icon: Upload, color: "#06b6d4", desc: "Upload student submissions" },
  { id: 3, label: "Model Answer", icon: FileText, color: "#a78bfa", desc: "Upload marking scheme" },
  { id: 4, label: "AI Marks", icon: Brain, color: "#f97316", desc: "Auto-generate scores" },
  { id: 5, label: "AI Feedback", icon: MessageSquare, color: "#4ADE80", desc: "Personalized feedback" },
  { id: 6, label: "OMR Check", icon: ScanLine, color: "#FBBF24", desc: "Optical mark recognition" },
  { id: 7, label: "Student Report", icon: FileBadge, color: "#f43f5e", desc: "Export PDF reports" },
] as const;

/* ─── GRADE COLOR ─── */
const gradeColor = (g: string) => {
  if (g === "A+") return "text-emerald-400";
  if (g === "A") return "text-green-400";
  if (g === "B+") return "text-blue-400";
  if (g === "B") return "text-cyan-400";
  return "text-yellow-400";
};

export default function EvaluatePage() {
  const [step, setStep] = useState<Step>(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* Step 1 - Auth */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  /* Step 2 & 3 - Uploads */
  const [answerFiles, setAnswerFiles] = useState<UploadedFile[]>([]);
  const [modelFiles, setModelFiles] = useState<UploadedFile[]>([]);
  const [drag2, setDrag2] = useState(false);
  const [drag3, setDrag3] = useState(false);

  /* Step 4 - Marks */
  const [marksLoading, setMarksLoading] = useState(false);
  const [marksReady, setMarksReady] = useState(false);
  const [marksProgress, setMarksProgress] = useState(0);

  /* Step 5 - Feedback */
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackReady, setFeedbackReady] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student>(MOCK_STUDENTS[0]);

  /* Step 6 - OMR */
  const [omrFiles, setOmrFiles] = useState<UploadedFile[]>([]);
  const [omrProcessing, setOmrProcessing] = useState(false);
  const [omrDone, setOmrDone] = useState(false);
  const [omrStudent, setOmrStudent] = useState<Student>(MOCK_STUDENTS[0]);
  const [drag6, setDrag6] = useState(false);

  /* Step 7 - Report */
  const [reportExporting, setReportExporting] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  /* ─── FILE HELPERS ─── */
  const addFiles = (files: FileList | null, setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>) => {
    if (!files) return;
    const arr: UploadedFile[] = Array.from(files).map(f => ({
      name: f.name, size: f.size, type: f.type,
    }));
    setter(prev => [...prev, ...arr]);
  };

  const fmtSize = (b: number) => b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;

  /* ─── STEP ACTIONS ─── */
  const handleLogin = () => {
    if (!email || !password) return;
    setLoginLoading(true);
    setTimeout(() => { setLoginLoading(false); setLoggedIn(true); }, 1800);
  };

  const handleGenerateMarks = () => {
    setMarksLoading(true); setMarksReady(false); setMarksProgress(0);
    const interval = setInterval(() => {
      setMarksProgress(p => {
        if (p >= 100) { clearInterval(interval); setMarksLoading(false); setMarksReady(true); return 100; }
        return p + Math.random() * 12;
      });
    }, 180);
  };

  const handleGenerateFeedback = () => {
    setFeedbackLoading(true); setFeedbackReady(false);
    setTimeout(() => { setFeedbackLoading(false); setFeedbackReady(true); }, 2200);
  };

  const handleOmrProcess = () => {
    setOmrProcessing(true); setOmrDone(false);
    setTimeout(() => { setOmrProcessing(false); setOmrDone(true); }, 2500);
  };

  const handleExportReport = () => {
    setReportExporting(true); setReportDone(false);
    setTimeout(() => { setReportExporting(false); setReportDone(true); }, 2000);
  };

  /* ─── DRAG & DROP ─── */
  const mkDrop = (
    setter: React.Dispatch<React.SetStateAction<UploadedFile[]>>,
    setDrag: (v: boolean) => void
  ) => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDrag(true); },
    onDragLeave: () => setDrag(false),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files, setter); },
  });

  const completedSteps = loggedIn
    ? [1, ...(answerFiles.length ? [2] : []), ...(modelFiles.length ? [3] : []),
      ...(marksReady ? [4] : []), ...(feedbackReady ? [5] : []),
      ...(omrDone ? [6] : []), ...(reportDone ? [7] : [])]
    : [];

  return (
    <div className="min-h-screen bg-[#030407] text-[#F0F0F8] flex font-sans overflow-hidden">

      {/* ══════════ SIDEBAR ══════════ */}
      <aside className={`fixed lg:relative inset-y-0 left-0 z-40 flex flex-col w-72 bg-[#080A14]/98 border-r border-[#13162A] transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} backdrop-blur-2xl`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-6 pt-7 pb-6 border-b border-[#13162A]">
          <Link href="/" className="flex items-center gap-2.5 group select-none">
            <div className="w-8 h-8 rounded-xl bg-[#7C6FE0]/15 border border-[#7C6FE0]/30 flex items-center justify-center">
              <BookOpen size={15} className="text-[#7C6FE0]" />
            </div>
            <span className="font-bold text-white text-base tracking-tight">Prep<span className="text-[#7C6FE0]">Forge</span></span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-[#8B8FA8] hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Product Badge */}
        <div className="mx-4 mt-5 mb-2 p-3 rounded-xl bg-gradient-to-r from-[#7C6FE0]/15 to-[#06b6d4]/10 border border-[#7C6FE0]/20">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={13} className="text-[#A89FF5]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#A89FF5]">Faculty Evaluation Suite</span>
          </div>
          <p className="text-[11px] text-[#8B8FA8]">AI-powered grading & reporting</p>
        </div>

        {/* Steps Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {STEPS.map((s) => {
            const done = completedSteps.includes(s.id);
            const active = step === s.id;
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => { setStep(s.id as Step); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 group ${
                  active
                    ? "bg-[#7C6FE0]/15 border border-[#7C6FE0]/30 text-white shadow-[0_0_20px_rgba(124,111,224,0.08)]"
                    : "hover:bg-white/[0.03] border border-transparent text-[#8B8FA8] hover:text-white"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                  done ? "bg-emerald-500/20 border border-emerald-500/30" :
                  active ? `border` : "bg-[#0D0F1C] border border-[#13162A]"
                }`}
                  style={active ? { background: `${s.color}20`, borderColor: `${s.color}40` } : {}}
                >
                  {done
                    ? <Check size={14} className="text-emerald-400" />
                    : <Icon size={14} style={active ? { color: s.color } : { color: "#8B8FA8" }} className="group-hover:scale-110 transition-transform" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-bold truncate ${active ? "text-white" : ""}`}>{s.label}</div>
                  <div className="text-[10px] text-[#4A4D60] truncate">{s.desc}</div>
                </div>
                {active && <ChevronRight size={14} className="text-[#7C6FE0] shrink-0" />}
                {done && !active && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* Progress Bar */}
        <div className="px-4 py-5 border-t border-[#13162A]">
          <div className="flex items-center justify-between text-[10px] text-[#8B8FA8] mb-2">
            <span>Pipeline Progress</span>
            <span className="text-white font-bold">{completedSteps.length}/7</span>
          </div>
          <div className="h-1.5 bg-[#13162A] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7C6FE0] to-[#06b6d4] transition-all duration-700"
              style={{ width: `${(completedSteps.length / 7) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-[#4A4D60] mt-2">
            {completedSteps.length === 7 ? "✅ All steps complete!" : `${7 - completedSteps.length} steps remaining`}
          </p>
        </div>
      </aside>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ══════════ MAIN CONTENT ══════════ */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">

        {/* Top Bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-[#13162A] bg-[#030407]/90 backdrop-blur-2xl">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-[#8B8FA8] hover:text-white p-1.5 rounded-lg hover:bg-white/5">
              <Menu size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#7C6FE0]" style={{ background: STEPS[step - 1].color }} />
                <h1 className="text-sm font-bold text-white">{STEPS[step - 1].label}</h1>
                <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-[#13162A] text-[10px] text-[#8B8FA8] font-mono">Step {step} of 7</span>
              </div>
              <p className="text-[11px] text-[#8B8FA8] mt-0.5">{STEPS[step - 1].desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {step < 7 && (
              <button
                onClick={() => setStep((step + 1) as Step)}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-[#13162A] hover:bg-[#7C6FE0]/15 border border-[#1C1F35] hover:border-[#7C6FE0]/30 text-xs font-semibold text-[#8B8FA8] hover:text-white transition-all"
              >
                Next <ChevronRight size={14} />
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C6FE0] to-[#06b6d4] flex items-center justify-center text-[11px] font-bold text-white">
              {loggedIn ? "FA" : "?"}
            </div>
          </div>
        </header>

        {/* ─────────────────── STEP CONTENT ─────────────────── */}
        <main className="flex-1 px-4 sm:px-8 py-8 max-w-5xl mx-auto w-full">

          {/* ══ STEP 1: FACULTY LOGIN ══ */}
          {step === 1 && (
            <div className="animate-fadeUp">
              {!loggedIn ? (
                <div className="max-w-md mx-auto">
                  {/* Hero */}
                  <div className="text-center mb-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7C6FE0] to-[#4f46e5] flex items-center justify-center mx-auto mb-5 shadow-[0_0_40px_rgba(124,111,224,0.4)]">
                      <ShieldCheck size={28} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Faculty Portal</h2>
                    <p className="text-[#8B8FA8] text-sm">Secure access for verified educators</p>
                  </div>

                  {/* Form card */}
                  <div className="relative rounded-3xl bg-[#0A0B16]/95 border border-[#1C1F35] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)]">
                    <div className="h-0.5 w-full bg-gradient-to-r from-[#7C6FE0] via-[#A89FF5] to-[#06b6d4]" />
                    <div className="p-8">
                      {/* Demo hint */}
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-[#7C6FE0]/10 border border-[#7C6FE0]/20 mb-6">
                        <AlertCircle size={13} className="text-[#A89FF5] shrink-0" />
                        <p className="text-[11px] text-[#A89FF5]">Demo: use any email + password to continue</p>
                      </div>

                      {/* Email */}
                      <div className="mb-4">
                        <label className="text-xs font-semibold text-[#8B8FA8] uppercase tracking-widest mb-2 block">Email Address</label>
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="faculty@institution.edu"
                          className="w-full px-4 py-3.5 rounded-xl bg-[#0D0F1C] border border-[#1C1F35] focus:border-[#7C6FE0]/60 focus:ring-2 focus:ring-[#7C6FE0]/20 outline-none text-sm text-white placeholder:text-[#4A4D60] transition-all"
                        />
                      </div>

                      {/* Password */}
                      <div className="mb-6">
                        <label className="text-xs font-semibold text-[#8B8FA8] uppercase tracking-widest mb-2 block">Password</label>
                        <div className="relative">
                          <input
                            type={showPass ? "text" : "password"}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••••"
                            onKeyDown={e => e.key === "Enter" && handleLogin()}
                            className="w-full px-4 py-3.5 pr-12 rounded-xl bg-[#0D0F1C] border border-[#1C1F35] focus:border-[#7C6FE0]/60 focus:ring-2 focus:ring-[#7C6FE0]/20 outline-none text-sm text-white placeholder:text-[#4A4D60] transition-all"
                          />
                          <button onClick={() => setShowPass(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4A4D60] hover:text-[#8B8FA8] transition-colors">
                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Login button */}
                      <button
                        onClick={handleLogin}
                        disabled={loginLoading || !email || !password}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-[#7C6FE0] to-[#6052c0] text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(124,111,224,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-[0.99]"
                      >
                        {loginLoading ? (
                          <><Loader2 size={16} className="animate-spin" /> Authenticating…</>
                        ) : (
                          <><LogIn size={16} /> Login to Dashboard</>
                        )}
                      </button>

                      <div className="mt-5 flex items-center gap-3">
                        <div className="flex-1 h-px bg-[#1C1F35]" />
                        <span className="text-[10px] text-[#4A4D60]">TRUSTED BY</span>
                        <div className="flex-1 h-px bg-[#1C1F35]" />
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {["500+ Faculties", "10K+ Sheets", "99.2% Accuracy"].map((t, i) => (
                          <div key={i} className="text-center p-2 rounded-lg bg-[#0D0F1C] border border-[#1C1F35]">
                            <p className="text-[10px] font-semibold text-[#8B8FA8]">{t}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* SUCCESS STATE */
                <div className="max-w-2xl mx-auto">
                  <div className="text-center p-10 rounded-3xl bg-[#0A0B16]/95 border border-emerald-500/20 shadow-[0_0_50px_rgba(74,222,128,0.08)]">
                    <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(74,222,128,0.2)]">
                      <Check size={36} className="text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Welcome back!</h2>
                    <p className="text-[#8B8FA8] mb-2">Logged in as <span className="text-white font-semibold">{email}</span></p>
                    <p className="text-sm text-[#4A4D60] mb-8">Faculty · Verified Educator · PrepForge Institute</p>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                      {[
                        { label: "Pending Evaluations", value: "3", icon: ClipboardList, color: "#7C6FE0" },
                        { label: "Students", value: "47", icon: Users, color: "#06b6d4" },
                        { label: "Reports Generated", value: "128", icon: FileBadge, color: "#4ADE80" },
                      ].map((s, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-[#0D0F1C] border border-[#1C1F35] text-center">
                          <s.icon size={20} className="mx-auto mb-2" style={{ color: s.color }} />
                          <p className="text-lg font-bold text-white">{s.value}</p>
                          <p className="text-[10px] text-[#8B8FA8]">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    <button onClick={() => setStep(2)} className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#7C6FE0] to-[#06b6d4] text-white font-bold text-sm flex items-center gap-2 mx-auto hover:scale-[1.02] transition-all shadow-[0_0_25px_rgba(124,111,224,0.3)]">
                      Start Evaluation Pipeline <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ STEP 2: UPLOAD ANSWER SHEETS ══ */}
          {step === 2 && (
            <div className="animate-fadeUp">
              <StepHeader
                icon={Upload} color="#06b6d4"
                title="Upload Answer Sheets"
                subtitle="Upload scanned student answer sheets (JPG, PNG, PDF). Bulk upload supported."
              />

              {/* Drop Zone */}
              <div
                {...mkDrop(setAnswerFiles, setDrag2)}
                className={`mt-6 border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 cursor-pointer ${
                  drag2 ? "border-[#06b6d4] bg-[#06b6d4]/5 scale-[1.01]" : "border-[#1C1F35] hover:border-[#06b6d4]/40 hover:bg-[#06b6d4]/[0.02]"
                }`}
                onClick={() => document.getElementById("ans-upload")?.click()}
              >
                <input id="ans-upload" type="file" multiple accept="image/*,.pdf" className="hidden" onChange={e => addFiles(e.target.files, setAnswerFiles)} />
                <div className="w-16 h-16 rounded-2xl bg-[#06b6d4]/10 border border-[#06b6d4]/20 flex items-center justify-center mx-auto mb-5">
                  <Upload size={28} className="text-[#06b6d4]" />
                </div>
                <p className="text-white font-bold text-lg mb-1">Drop answer sheets here</p>
                <p className="text-[#8B8FA8] text-sm mb-3">or click to browse files</p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {["JPG", "PNG", "PDF", "TIFF"].map(f => (
                    <span key={f} className="px-2.5 py-1 rounded-lg bg-[#13162A] border border-[#1C1F35] text-[10px] font-mono text-[#8B8FA8]">{f}</span>
                  ))}
                </div>
              </div>

              {/* File list */}
              {answerFiles.length > 0 && (
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-[#8B8FA8] uppercase tracking-widest">{answerFiles.length} file{answerFiles.length > 1 ? "s" : ""} uploaded</p>
                    <button onClick={() => setAnswerFiles([])} className="text-xs text-[#EF4444] hover:text-red-300 transition-colors">Clear all</button>
                  </div>
                  {answerFiles.map((f, i) => (
                    <FileRow key={i} file={f} color="#06b6d4" onRemove={() => setAnswerFiles(p => p.filter((_, j) => j !== i))} fmtSize={fmtSize} />
                  ))}
                </div>
              )}

              {/* Tips */}
              <div className="mt-6 grid sm:grid-cols-3 gap-4">
                {[
                  { icon: "📷", tip: "Scan at 300 DPI for best accuracy" },
                  { icon: "📁", tip: "Name files as StudentName_RollNo" },
                  { icon: "🔒", tip: "All uploads are encrypted & private" },
                ].map((t, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-[#0A0B16] border border-[#13162A] flex items-start gap-3">
                    <span className="text-xl">{t.icon}</span>
                    <p className="text-[11px] text-[#8B8FA8] leading-relaxed">{t.tip}</p>
                  </div>
                ))}
              </div>

              <NavButtons step={step} setStep={setStep} canNext={answerFiles.length > 0} />
            </div>
          )}

          {/* ══ STEP 3: MODEL ANSWER ══ */}
          {step === 3 && (
            <div className="animate-fadeUp">
              <StepHeader
                icon={FileText} color="#a78bfa"
                title="Upload Model Answer / Marking Scheme"
                subtitle="Upload the official answer key or marking rubric. The AI uses this to evaluate student responses."
              />

              <div
                {...mkDrop(setModelFiles, setDrag3)}
                className={`mt-6 border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 cursor-pointer ${
                  drag3 ? "border-[#a78bfa] bg-[#a78bfa]/5 scale-[1.01]" : "border-[#1C1F35] hover:border-[#a78bfa]/40 hover:bg-[#a78bfa]/[0.02]"
                }`}
                onClick={() => document.getElementById("model-upload")?.click()}
              >
                <input id="model-upload" type="file" multiple accept="image/*,.pdf,.docx" className="hidden" onChange={e => addFiles(e.target.files, setModelFiles)} />
                <div className="w-16 h-16 rounded-2xl bg-[#a78bfa]/10 border border-[#a78bfa]/20 flex items-center justify-center mx-auto mb-5">
                  <FileText size={28} className="text-[#a78bfa]" />
                </div>
                <p className="text-white font-bold text-lg mb-1">Drop model answer here</p>
                <p className="text-[#8B8FA8] text-sm mb-3">Marking scheme, rubric, or answer key</p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {["PDF", "DOCX", "JPG", "PNG"].map(f => (
                    <span key={f} className="px-2.5 py-1 rounded-lg bg-[#13162A] border border-[#1C1F35] text-[10px] font-mono text-[#8B8FA8]">{f}</span>
                  ))}
                </div>
              </div>

              {modelFiles.length > 0 && (
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-[#8B8FA8] uppercase tracking-widest">{modelFiles.length} file{modelFiles.length > 1 ? "s" : ""} uploaded</p>
                    <button onClick={() => setModelFiles([])} className="text-xs text-[#EF4444] hover:text-red-300 transition-colors">Clear all</button>
                  </div>
                  {modelFiles.map((f, i) => (
                    <FileRow key={i} file={f} color="#a78bfa" onRemove={() => setModelFiles(p => p.filter((_, j) => j !== i))} fmtSize={fmtSize} />
                  ))}
                </div>
              )}

              {/* Marking config */}
              <div className="mt-6 p-6 rounded-2xl bg-[#0A0B16] border border-[#1C1F35]">
                <p className="text-xs font-bold text-[#8B8FA8] uppercase tracking-widest mb-4">Marking Configuration</p>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { label: "Total Marks", value: "100", color: "#a78bfa" },
                    { label: "Passing Marks", value: "35", color: "#4ADE80" },
                    { label: "Negative Marking", value: "Yes (−¼)", color: "#FBBF24" },
                  ].map((c, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#0D0F1C] border border-[#13162A]">
                      <p className="text-[10px] text-[#8B8FA8] mb-1">{c.label}</p>
                      <p className="text-base font-bold" style={{ color: c.color }}>{c.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <NavButtons step={step} setStep={setStep} canNext={modelFiles.length > 0} />
            </div>
          )}

          {/* ══ STEP 4: AI MARKS GENERATE ══ */}
          {step === 4 && (
            <div className="animate-fadeUp">
              <StepHeader
                icon={Brain} color="#f97316"
                title="AI Marks Generation"
                subtitle="Gemini AI analyzes each answer against the marking scheme and auto-assigns marks with reasoning."
              />

              {!marksReady ? (
                <div className="mt-8">
                  {!marksLoading ? (
                    <div className="text-center p-12 rounded-3xl bg-[#0A0B16] border border-[#1C1F35]">
                      <div className="w-20 h-20 rounded-2xl bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center mx-auto mb-6">
                        <Brain size={36} className="text-[#f97316]" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Ready to Analyze</h3>
                      <p className="text-[#8B8FA8] text-sm mb-2">
                        {answerFiles.length} answer sheet{answerFiles.length !== 1 ? "s" : ""} · {MOCK_STUDENTS.length} students detected
                      </p>
                      <p className="text-[#4A4D60] text-xs mb-8">AI will evaluate each answer, assign marks, and provide reasoning</p>

                      <div className="grid grid-cols-3 gap-4 mb-8 max-w-sm mx-auto">
                        {[
                          { label: "Sheets", value: Math.max(answerFiles.length, 3), color: "#f97316" },
                          { label: "Questions", value: 10, color: "#7C6FE0" },
                          { label: "Est. Time", value: "~30s", color: "#4ADE80" },
                        ].map((s, i) => (
                          <div key={i} className="p-3 rounded-xl bg-[#0D0F1C] border border-[#13162A] text-center">
                            <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                            <p className="text-[10px] text-[#8B8FA8]">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      <button onClick={handleGenerateMarks} className="px-10 py-4 rounded-2xl bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white font-bold flex items-center gap-2 mx-auto hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:shadow-[0_0_50px_rgba(249,115,22,0.5)]">
                        <Brain size={18} /> Generate AI Marks
                      </button>
                    </div>
                  ) : (
                    <div className="p-10 rounded-3xl bg-[#0A0B16] border border-[#f97316]/20 shadow-[0_0_40px_rgba(249,115,22,0.08)]">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center">
                          <Loader2 size={22} className="text-[#f97316] animate-spin" />
                        </div>
                        <div>
                          <p className="font-bold text-white">Gemini AI Analyzing…</p>
                          <p className="text-xs text-[#8B8FA8]">Processing answer sheets against marking rubric</p>
                        </div>
                        <span className="ml-auto text-2xl font-bold text-[#f97316]">{Math.min(100, Math.round(marksProgress))}%</span>
                      </div>
                      <div className="h-3 bg-[#13162A] rounded-full overflow-hidden mb-6">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#f97316] to-[#FBBF24] transition-all duration-300 relative overflow-hidden"
                          style={{ width: `${Math.min(100, marksProgress)}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        {[
                          { label: "Extracting text from scans", done: marksProgress > 20 },
                          { label: "Parsing answer structure", done: marksProgress > 45 },
                          { label: "Comparing with model answer", done: marksProgress > 65 },
                          { label: "Assigning marks & reasoning", done: marksProgress > 85 },
                          { label: "Compiling results", done: marksProgress >= 100 },
                        ].map((task, i) => (
                          <div key={i} className="flex items-center gap-3">
                            {task.done
                              ? <Check size={14} className="text-emerald-400 shrink-0" />
                              : marksProgress > i * 20
                                ? <Loader2 size={14} className="text-[#f97316] animate-spin shrink-0" />
                                : <div className="w-3.5 h-3.5 rounded-full border border-[#1C1F35] shrink-0" />
                            }
                            <span className={`text-xs ${task.done ? "text-emerald-400" : "text-[#8B8FA8]"}`}>{task.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* MARKS RESULTS TABLE */
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Check size={18} className="text-emerald-400" />
                      <p className="text-sm font-bold text-white">Marks Generated Successfully</p>
                    </div>
                    <button onClick={handleGenerateMarks} className="flex items-center gap-1.5 text-xs text-[#8B8FA8] hover:text-white transition-colors">
                      <RefreshCw size={13} /> Re-analyze
                    </button>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: "Class Average", value: "74%", icon: BarChart3, color: "#7C6FE0" },
                      { label: "Highest Score", value: "87/100", icon: Award, color: "#FBBF24" },
                      { label: "Pass Rate", value: "100%", icon: TrendingUp, color: "#4ADE80" },
                      { label: "Evaluated", value: `${MOCK_STUDENTS.length} students`, icon: Users, color: "#06b6d4" },
                    ].map((s, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-[#0A0B16] border border-[#13162A] hover:border-[#1C1F35] transition-colors">
                        <s.icon size={16} className="mb-2" style={{ color: s.color }} />
                        <p className="text-lg font-bold text-white">{s.value}</p>
                        <p className="text-[10px] text-[#8B8FA8]">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Marks Table */}
                  <div className="rounded-2xl bg-[#0A0B16] border border-[#1C1F35] overflow-hidden">
                    <div className="grid grid-cols-6 px-5 py-3 border-b border-[#13162A] text-[10px] font-bold text-[#8B8FA8] uppercase tracking-widest">
                      <span>Student</span>
                      <span>Roll No</span>
                      <span className="text-center">Score</span>
                      <span className="text-center">Grade</span>
                      <span className="text-center">Accuracy</span>
                      <span className="text-center">Rank</span>
                    </div>
                    {MOCK_STUDENTS.map((s, i) => (
                      <div key={i} className="grid grid-cols-6 px-5 py-4 border-b border-[#0D0F1C] hover:bg-white/[0.015] transition-colors items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C6FE0]/30 to-[#06b6d4]/30 flex items-center justify-center text-[10px] font-bold text-white">
                            {s.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <span className="text-sm font-semibold text-white truncate">{s.name}</span>
                        </div>
                        <span className="text-xs text-[#8B8FA8] font-mono">{s.roll}</span>
                        <div className="text-center">
                          <span className="text-sm font-bold text-white">{s.marks}</span>
                          <span className="text-[10px] text-[#4A4D60]">/{s.total}</span>
                        </div>
                        <div className="text-center">
                          <span className={`text-sm font-extrabold ${gradeColor(s.grade)}`}>{s.grade}</span>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-1.5 justify-center">
                            <div className="h-1.5 w-16 bg-[#13162A] rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-[#7C6FE0] to-[#4ADE80]" style={{ width: `${s.accuracy}%` }} />
                            </div>
                            <span className="text-[11px] text-[#8B8FA8]">{s.accuracy}%</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <span className={`text-sm font-bold ${s.rank === 1 ? "text-[#FBBF24]" : "text-[#8B8FA8]"}`}>#{s.rank}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <NavButtons step={step} setStep={setStep} canNext={marksReady} />
                </div>
              )}
            </div>
          )}

          {/* ══ STEP 5: AI FEEDBACK ══ */}
          {step === 5 && (
            <div className="animate-fadeUp">
              <StepHeader
                icon={MessageSquare} color="#4ADE80"
                title="AI Feedback Generation"
                subtitle="Personalized feedback per student — strengths, weaknesses, improvement suggestions & topic-wise gap analysis."
              />

              <div className="mt-6 flex gap-4">
                {/* Student selector */}
                <div className="w-52 shrink-0 space-y-2">
                  <p className="text-[10px] font-bold text-[#8B8FA8] uppercase tracking-widest mb-3">Students</p>
                  {MOCK_STUDENTS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudent(s)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selectedStudent.id === s.id
                          ? "bg-[#4ADE80]/10 border-[#4ADE80]/30 text-white"
                          : "bg-[#0A0B16] border-[#13162A] text-[#8B8FA8] hover:border-[#1C1F35] hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#13162A] flex items-center justify-center text-[9px] font-bold text-[#8B8FA8] shrink-0">
                          {s.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-xs font-bold truncate">{s.name.split(" ")[0]}</p>
                          <p className={`text-[10px] font-bold ${gradeColor(s.grade)}`}>{s.marks}/100</p>
                        </div>
                      </div>
                    </button>
                  ))}

                  {!feedbackReady && (
                    <button onClick={handleGenerateFeedback} disabled={feedbackLoading}
                      className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-[#4ADE80]/80 to-[#22c55e] text-black font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-60 hover:scale-[1.01] transition-all">
                      {feedbackLoading ? <Loader2 size={13} className="animate-spin text-black" /> : <Brain size={13} />}
                      {feedbackLoading ? "Generating…" : "Generate All"}
                    </button>
                  )}
                </div>

                {/* Feedback Panel */}
                <div className="flex-1 space-y-4">
                  {!feedbackReady && !feedbackLoading && (
                    <div className="h-64 rounded-2xl bg-[#0A0B16] border border-[#13162A] flex flex-col items-center justify-center text-center p-8">
                      <MessageSquare size={32} className="text-[#1C1F35] mb-3" />
                      <p className="text-[#8B8FA8] text-sm font-medium">Click "Generate All" to create personalized feedback</p>
                    </div>
                  )}

                  {feedbackLoading && (
                    <div className="h-64 rounded-2xl bg-[#0A0B16] border border-[#4ADE80]/20 flex flex-col items-center justify-center text-center p-8">
                      <Loader2 size={28} className="text-[#4ADE80] animate-spin mb-3" />
                      <p className="text-white font-bold mb-1">Analyzing {selectedStudent.name}…</p>
                      <p className="text-[#8B8FA8] text-sm">Identifying patterns & generating insights</p>
                    </div>
                  )}

                  {feedbackReady && (
                    <>
                      {/* Strengths */}
                      <FeedbackSection title="✅ Strengths" color="#4ADE80" items={selectedStudent.strengths} />
                      {/* Weaknesses */}
                      <FeedbackSection title="⚠️ Weaknesses" color="#FBBF24" items={selectedStudent.weaknesses} />
                      {/* Suggestions */}
                      <FeedbackSection title="💡 Improvement Suggestions" color="#7C6FE0" items={selectedStudent.suggestions} />
                      {/* Topic Gaps */}
                      <div className="p-5 rounded-2xl bg-[#0A0B16] border border-[#13162A]">
                        <p className="text-xs font-bold text-[#8B8FA8] uppercase tracking-widest mb-4">🗺️ Topic-wise Gap Analysis</p>
                        <div className="space-y-3">
                          {selectedStudent.topicGaps.map((g, i) => (
                            <div key={i}>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-[#C0C4D8] font-medium">{g.topic}</span>
                                <span className={`font-bold ${g.score < 50 ? "text-[#EF4444]" : g.score < 70 ? "text-[#FBBF24]" : "text-[#4ADE80]"}`}>{g.score}%</span>
                              </div>
                              <div className="h-2 bg-[#13162A] rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${g.score}%`,
                                    background: g.score < 50 ? "#EF4444" : g.score < 70 ? "#FBBF24" : "#4ADE80"
                                  }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {feedbackReady && <NavButtons step={step} setStep={setStep} canNext={feedbackReady} />}
            </div>
          )}

          {/* ══ STEP 6: OMR CHECKING ══ */}
          {step === 6 && (
            <div className="animate-fadeUp">
              <StepHeader
                icon={ScanLine} color="#FBBF24"
                title="OMR Sheet Evaluation"
                subtitle="Upload filled OMR sheets. AI optical recognition auto-checks responses against the answer key."
              />

              <div className="mt-6 grid lg:grid-cols-2 gap-6">
                {/* Left: Upload + Answer Key */}
                <div className="space-y-4">
                  {/* Answer Key Display */}
                  <div className="p-5 rounded-2xl bg-[#0A0B16] border border-[#FBBF24]/20">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-bold text-[#FBBF24] uppercase tracking-widest">Answer Key</p>
                      <span className="text-[10px] text-[#8B8FA8] font-mono">{OMR_KEY.length} questions</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {OMR_KEY.map((ans, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <span className="text-[9px] text-[#4A4D60] font-mono">Q{i + 1}</span>
                          <div className="w-8 h-8 rounded-lg bg-[#FBBF24]/15 border border-[#FBBF24]/30 flex items-center justify-center text-sm font-bold text-[#FBBF24]">
                            {ans}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-4 flex-wrap">
                      {["Correct: +4", "Wrong: −1", "Skip: 0"].map((t, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-[#13162A] border border-[#1C1F35] text-[10px] font-mono text-[#8B8FA8]">{t}</span>
                      ))}
                    </div>
                  </div>

                  {/* OMR Upload */}
                  <div
                    {...mkDrop(setOmrFiles, setDrag6)}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer ${
                      drag6 ? "border-[#FBBF24] bg-[#FBBF24]/5" : "border-[#1C1F35] hover:border-[#FBBF24]/30"
                    }`}
                    onClick={() => document.getElementById("omr-upload")?.click()}
                  >
                    <input id="omr-upload" type="file" multiple accept="image/*,.pdf" className="hidden" onChange={e => addFiles(e.target.files, setOmrFiles)} />
                    <ScanLine size={28} className="text-[#FBBF24] mx-auto mb-3" />
                    <p className="text-sm font-bold text-white">Upload OMR Sheets</p>
                    <p className="text-[11px] text-[#8B8FA8] mt-1">JPG, PNG, PDF</p>
                  </div>

                  {/* Student selector */}
                  {(omrFiles.length > 0 || true) && (
                    <div>
                      <p className="text-[10px] font-bold text-[#8B8FA8] uppercase tracking-widest mb-3">Preview Student</p>
                      <div className="flex gap-2 flex-wrap">
                        {MOCK_STUDENTS.map(s => (
                          <button key={s.id} onClick={() => setOmrStudent(s)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                              omrStudent.id === s.id
                                ? "bg-[#FBBF24]/15 border-[#FBBF24]/30 text-[#FBBF24]"
                                : "bg-[#0A0B16] border-[#13162A] text-[#8B8FA8] hover:text-white"
                            }`}>
                            {s.name.split(" ")[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleOmrProcess}
                    disabled={omrProcessing}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] text-black font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 hover:scale-[1.01] transition-all shadow-[0_0_25px_rgba(251,191,36,0.2)]"
                  >
                    {omrProcessing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                    {omrProcessing ? "Processing OMR…" : "Run OMR Evaluation"}
                  </button>
                </div>

                {/* Right: OMR Result */}
                <div>
                  <div className="p-5 rounded-2xl bg-[#0A0B16] border border-[#1C1F35] min-h-[400px]">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <p className="text-sm font-bold text-white">{omrStudent.name}</p>
                        <p className="text-[11px] text-[#8B8FA8] font-mono">{omrStudent.roll}</p>
                      </div>
                      {omrDone && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
                          <span className="text-[11px] text-[#4ADE80] font-semibold">Evaluated</span>
                        </div>
                      )}
                    </div>

                    {!omrDone && !omrProcessing && (
                      <div className="flex flex-col items-center justify-center h-48 text-center">
                        <ScanLine size={32} className="text-[#1C1F35] mb-3" />
                        <p className="text-[#4A4D60] text-sm">OMR results will appear here</p>
                      </div>
                    )}

                    {omrProcessing && (
                      <div className="flex flex-col items-center justify-center h-48 text-center">
                        <Loader2 size={28} className="text-[#FBBF24] animate-spin mb-3" />
                        <p className="text-[#8B8FA8] text-sm">Scanning optical marks…</p>
                      </div>
                    )}

                    {omrDone && (
                      <>
                        {/* OMR Bubble Grid */}
                        <div className="space-y-2 mb-5">
                          {(omrStudent.omrAnswers ?? []).map((ans, qi) => (
                            <div key={qi} className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-[#4A4D60] w-6">Q{qi + 1}</span>
                              {["A", "B", "C", "D"].map(opt => {
                                const isSelected = ans === opt;
                                const isCorrect = OMR_KEY[qi] === opt;
                                const studentCorrect = omrStudent.omrCorrect?.[qi];
                                return (
                                  <div key={opt} className={`w-7 h-7 rounded-full border flex items-center justify-center text-[9px] font-bold transition-all ${
                                    isSelected
                                      ? studentCorrect
                                        ? "bg-[#4ADE80]/20 border-[#4ADE80]/60 text-[#4ADE80] shadow-[0_0_8px_rgba(74,222,128,0.3)]"
                                        : "bg-[#EF4444]/20 border-[#EF4444]/60 text-[#EF4444]"
                                      : isCorrect && !studentCorrect
                                        ? "bg-[#4ADE80]/10 border-[#4ADE80]/20 text-[#4ADE80]/60"
                                        : "border-[#1C1F35] text-[#4A4D60]"
                                  }`}>{opt}</div>
                                );
                              })}
                              <span className={`ml-auto text-[11px] font-bold ${omrStudent.omrCorrect?.[qi] ? "text-[#4ADE80]" : "text-[#EF4444]"}`}>
                                {omrStudent.omrCorrect?.[qi] ? "+4" : "-1"}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Score Summary */}
                        <div className="p-4 rounded-xl bg-[#0D0F1C] border border-[#1C1F35]">
                          <div className="grid grid-cols-3 gap-3 text-center">
                            {[
                              { label: "Score", value: `${(omrStudent.omrCorrect?.filter(Boolean).length ?? 0) * 4 - (omrStudent.omrCorrect?.filter(v => !v).length ?? 0)}/${(omrStudent.omrAnswers?.length ?? 0) * 4}`, color: "#FBBF24" },
                              { label: "Correct", value: `${omrStudent.omrCorrect?.filter(Boolean).length ?? 0}/${omrStudent.omrAnswers?.length ?? 0}`, color: "#4ADE80" },
                              { label: "Accuracy", value: `${Math.round(((omrStudent.omrCorrect?.filter(Boolean).length ?? 0) / (omrStudent.omrAnswers?.length ?? 1)) * 100)}%`, color: "#7C6FE0" },
                            ].map((s, i) => (
                              <div key={i}>
                                <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
                                <p className="text-[10px] text-[#8B8FA8]">{s.label}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {omrDone && <NavButtons step={step} setStep={setStep} canNext={omrDone} />}
            </div>
          )}

          {/* ══ STEP 7: STUDENT REPORT PDF ══ */}
          {step === 7 && (
            <div className="animate-fadeUp">
              <StepHeader
                icon={FileBadge} color="#f43f5e"
                title="Student Report Generation"
                subtitle="Generate & export comprehensive PDF reports for each student, or a class-wide summary."
              />

              <div className="mt-6 grid lg:grid-cols-3 gap-4">
                {MOCK_STUDENTS.map((s, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-[#0A0B16] border border-[#1C1F35] hover:border-[#f43f5e]/30 transition-all group">
                    {/* Student Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C6FE0]/30 to-[#f43f5e]/20 flex items-center justify-center text-xs font-bold text-white">
                        {s.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{s.name}</p>
                        <p className="text-[10px] font-mono text-[#8B8FA8]">{s.roll}</p>
                      </div>
                    </div>

                    {/* Report Preview Card */}
                    <div className="p-3 rounded-xl bg-[#0D0F1C] border border-[#13162A] mb-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[#8B8FA8]">Total Score</span>
                        <span className="text-sm font-bold text-white">{s.marks}/{s.total}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[#8B8FA8]">Grade</span>
                        <span className={`text-sm font-bold ${gradeColor(s.grade)}`}>{s.grade}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[#8B8FA8]">Class Rank</span>
                        <span className="text-sm font-bold text-[#FBBF24]">#{s.rank}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[#8B8FA8]">Topic Gaps</span>
                        <span className="text-sm font-bold text-[#EF4444]">{s.topicGaps.filter(t => t.score < 60).length} critical</span>
                      </div>
                    </div>

                    {/* Report Contents badges */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {["Marks", "Feedback", "Topic Map", "Suggestions", "OMR"].map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-md bg-[#13162A] text-[9px] font-mono text-[#8B8FA8]">{tag}</span>
                      ))}
                    </div>

                    <button className="w-full py-2.5 rounded-xl bg-[#f43f5e]/10 border border-[#f43f5e]/25 text-[#f43f5e] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#f43f5e]/20 transition-all group-hover:shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                      <Download size={13} /> Export PDF
                    </button>
                  </div>
                ))}
              </div>

              {/* Class Report */}
              <div className="mt-6 p-6 rounded-2xl bg-gradient-to-r from-[#f43f5e]/10 to-[#7C6FE0]/10 border border-[#f43f5e]/20">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-sm font-bold text-white mb-1">📊 Full Class Report</p>
                    <p className="text-[11px] text-[#8B8FA8]">Combined PDF with all students · rank analysis · subject-wise insights · improvement roadmap</p>
                  </div>
                  <button
                    onClick={handleExportReport}
                    disabled={reportExporting}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#f43f5e] to-[#e11d48] text-white font-bold text-sm hover:scale-[1.02] transition-all shadow-[0_0_25px_rgba(244,63,94,0.3)] disabled:opacity-60"
                  >
                    {reportExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    {reportExporting ? "Generating PDF…" : "Export Class Report"}
                  </button>
                </div>

                {reportDone && (
                  <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <Check size={16} className="text-emerald-400" />
                    <p className="text-sm text-emerald-400 font-semibold">Class report exported! <span className="text-[#8B8FA8] font-normal">PrepForge_Class_Report_2024.pdf (2.4 MB)</span></p>
                    <button className="ml-auto flex items-center gap-1 text-xs text-[#8B8FA8] hover:text-white transition-colors">
                      <Share2 size={13} /> Share
                    </button>
                  </div>
                )}
              </div>

              {/* Share Options */}
              <div className="mt-6 grid sm:grid-cols-3 gap-4">
                {[
                  { icon: "📧", label: "Email to Students", desc: "Auto-send individual reports", color: "#7C6FE0" },
                  { icon: "☁️", label: "Cloud Storage", desc: "Save to Google Drive / S3", color: "#06b6d4" },
                  { icon: "📱", label: "WhatsApp Share", desc: "Send via institutional group", color: "#4ADE80" },
                ].map((opt, i) => (
                  <button key={i} className="p-4 rounded-2xl bg-[#0A0B16] border border-[#13162A] hover:border-[#1C1F35] text-left transition-all hover:-translate-y-0.5">
                    <span className="text-2xl block mb-2">{opt.icon}</span>
                    <p className="text-sm font-bold text-white mb-0.5">{opt.label}</p>
                    <p className="text-[11px] text-[#8B8FA8]">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {/* Completion Banner */}
              {reportDone && (
                <div className="mt-6 p-6 rounded-2xl bg-gradient-to-r from-[#7C6FE0]/15 via-[#4ADE80]/10 to-[#f43f5e]/10 border border-[#7C6FE0]/25 text-center">
                  <div className="text-3xl mb-3">🎉</div>
                  <h3 className="text-lg font-bold text-white mb-1">Evaluation Pipeline Complete!</h3>
                  <p className="text-[#8B8FA8] text-sm">All 7 steps done · AI marks generated · Feedback written · OMR checked · Reports exported</p>
                  <Link href="/" className="inline-flex items-center gap-2 mt-4 px-6 py-2.5 rounded-xl bg-[#7C6FE0]/20 border border-[#7C6FE0]/30 text-[#A89FF5] text-sm font-bold hover:bg-[#7C6FE0]/30 transition-all">
                    Back to PrepForge <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeUp { animation: fadeUp 0.4s ease forwards; }
        @keyframes shimmer {
          from { transform: translateX(-200%); }
          to   { transform: translateX(200%); }
        }
        .animate-shimmer { animation: shimmer 1.5s infinite; }
      `}</style>
    </div>
  );
}

/* ─── SUB-COMPONENTS ─── */

function StepHeader({ icon: Icon, color, title, subtitle }: {
  icon: React.ElementType; color: string; title: string; subtitle: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${color}20`, border: `1px solid ${color}40`, boxShadow: `0 0 20px ${color}20` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="text-[#8B8FA8] text-sm mt-0.5 leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
}

function FileRow({ file, color, onRemove, fmtSize }: {
  file: UploadedFile; color: string; onRemove: () => void; fmtSize: (b: number) => string;
}) {
  const ext = file.name.split(".").pop()?.toUpperCase() ?? "FILE";
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#0A0B16] border border-[#13162A] hover:border-[#1C1F35] transition-colors group">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
        {ext}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">{file.name}</p>
        <p className="text-[10px] text-[#4A4D60] font-mono">{fmtSize(file.size)}</p>
      </div>
      <Check size={13} className="text-emerald-400 shrink-0" />
      <button onClick={onRemove} className="text-[#4A4D60] hover:text-[#EF4444] transition-colors opacity-0 group-hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

function FeedbackSection({ title, color, items }: { title: string; color: string; items: string[] }) {
  return (
    <div className="p-5 rounded-2xl bg-[#0A0B16] border border-[#13162A]">
      <p className="text-xs font-bold text-[#8B8FA8] uppercase tracking-widest mb-3">{title}</p>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-white/[0.02] transition-colors">
            <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
            <p className="text-sm text-[#C0C4D8]">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NavButtons({ step, setStep, canNext }: {
  step: Step; setStep: (s: Step) => void; canNext: boolean;
}) {
  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#13162A]">
      {step > 1 ? (
        <button onClick={() => setStep((step - 1) as Step)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A0B16] border border-[#1C1F35] text-sm font-semibold text-[#8B8FA8] hover:text-white hover:border-[#7C6FE0]/30 transition-all">
          ← Back
        </button>
      ) : <div />}
      {step < 7 && (
        <button
          onClick={() => setStep((step + 1) as Step)}
          disabled={!canNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#7C6FE0] to-[#6052c0] text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(124,111,224,0.25)] hover:shadow-[0_0_30px_rgba(124,111,224,0.4)]"
        >
          Continue <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
