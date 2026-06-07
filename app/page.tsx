"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { gsap } from "gsap";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Brain,
  ClipboardCheck,
  FileBadge,
  FileText,
  ScanLine,
  ShieldCheck,
  Upload,
} from "lucide-react";

const evaluationCards = [
  {
    icon: FileText,
    title: "Descriptive Answer Evaluation",
    text: "Faculty can upload scanned answer sheets or images. The system evaluates answers based on predefined marking criteria and generates marks, feedback, strengths, weaknesses, and improvement suggestions.",
    badge: "JEE/NEET Descriptive",
    color: "bg-indigo-50 text-indigo-600 border-indigo-100",
  },
  {
    icon: ScanLine,
    title: "OMR Evaluation",
    text: "Faculty uploads the answer key and OMR sheets. PrepForge checks responses, calculates scores, and creates detailed accuracy, subject-wise performance, and rank analysis reports.",
    badge: "Bubble Sheet Audit",
    color: "bg-teal-50 text-teal-600 border-teal-100",
  },
];

const workflow = [
  { icon: Upload, label: "Upload Answer Sheets", sub: "PDF, JPG, PNG scans", value: "42 files", bar: "w-[78%]", color: "#EF8B4F" },
  { icon: ClipboardCheck, label: "Apply Marking Criteria", sub: "Rubric + model answer", value: "96% parsed", bar: "w-[72%]", color: "#21C6D9" },
  { icon: Brain, label: "Generate AI Marks", sub: "Evidence-backed scoring", value: "0.86 confidence", bar: "w-[65%]", color: "#7C6FE0" },
  { icon: FileBadge, label: "Student Report PDF", sub: "Gaps, rank, accuracy", value: "Ready", bar: "w-[88%]", color: "#22C55E" },
];

const reportStats = [
  ["Marks", "87/100"],
  ["Accuracy", "91%"],
  ["Rank", "#03"],
  ["Gaps", "4 topics"],
];

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // Hero elements entrance
      gsap.fromTo(
        ".hero-badge",
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
      );

      gsap.fromTo(
        ".hero-title",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, delay: 0.15, ease: "power3.out" }
      );

      gsap.fromTo(
        ".hero-desc",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, delay: 0.3, ease: "power3.out" }
      );

      gsap.fromTo(
        ".hero-btns",
        { y: 15, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, delay: 0.45, ease: "power3.out" }
      );

      gsap.fromTo(
        ".hero-dashboard",
        { scale: 0.96, opacity: 0, y: 10 },
        { scale: 1, opacity: 1, y: 0, duration: 1.1, delay: 0.35, ease: "power3.out" }
      );

      // Cards stagger reveal
      gsap.fromTo(
        ".stagger-card",
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: "power3.out", scrollTrigger: { trigger: ".stagger-card", start: "top 85%" } }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#FAF9FC] text-slate-900 selection:bg-indigo-150 selection:text-indigo-700">
      <Navbar />
      <main className="overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative min-h-[860px] px-5 pb-20 pt-28 md:min-h-[780px] md:pt-36 flex items-center justify-center">
          <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.07] pointer-events-none"
            style={{ backgroundImage: "url('/assets/main-page.jpg')" }}
          />
          <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_42%_35%,rgba(79,70,229,0.04),transparent_32%),linear-gradient(180deg,transparent 60%,#FAF9FC 100%)] pointer-events-none" />

          <div className="relative z-10 mx-auto grid max-w-[1180px] items-center gap-12 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:pt-20 w-full">
            <div>
              <div className="hero-badge opacity-0 mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/70 px-4 py-2 text-[11px] font-bold text-indigo-700 shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.7)]" />
                Descriptive + OMR Evaluation Suite
              </div>

              <h1 className="hero-title opacity-0 max-w-[620px] text-[2.85rem] sm:text-[4.15rem] font-black leading-[1.08] tracking-[-0.03em] text-slate-900 drop-shadow-sm md:text-[5.2rem] lg:text-[5.4rem]">
                Evaluate JEE &amp; NEET
                <span className="block text-indigo-600">answers like experts.</span>
              </h1>

              <p className="hero-desc opacity-0 mt-8 max-w-[580px] text-[17px] font-medium leading-8 text-slate-500">
                PrepForge helps faculty upload scanned answer sheets, audit OMR bubble sheets,
                generate automated AI marks with quotes, identify concept gaps, and export reports.
              </p>

              <div className="hero-btns opacity-0 mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/evaluate"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-indigo-600 px-9 text-[15px] font-black text-white shadow-[0_10px_30px_rgba(79,70,229,0.25)] transition hover:bg-indigo-500 hover:shadow-[0_12px_35px_rgba(79,70,229,0.35)] hover:translate-y-[-2px] active:scale-[0.98]"
                >
                  Start Evaluating Free <ArrowRight size={17} />
                </Link>
                <Link
                  href="#workflow"
                  className="inline-flex h-14 items-center justify-center rounded-full border border-slate-200 bg-white/80 px-9 text-[15px] font-black text-slate-700 shadow-sm backdrop-blur transition hover:border-slate-300 hover:bg-slate-50"
                >
                  See Evaluation Flow
                </Link>
              </div>
            </div>

            {/* Interactive Preview Dashboard */}
            <div className="hero-dashboard opacity-0 relative">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-indigo-500/5 blur-3xl pointer-events-none" />
              <div className="relative overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
                {/* Windows top bar */}
                <div className="flex h-[52px] items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6">
                  <div className="flex gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#FF5656]/90" />
                    <span className="h-3 w-3 rounded-full bg-[#FACC15]/90" />
                    <span className="h-3 w-3 rounded-full bg-[#22C55E]/90" />
                  </div>
                  <div className="rounded-full border border-indigo-100 bg-indigo-50/80 px-5 py-1.5 text-[11px] font-bold text-indigo-700">
                    PrepForge - Active Batch Console
                  </div>
                  <div className="w-[52px]" />
                </div>

                {/* Dashboard content */}
                <div className="space-y-4 p-6">
                  {workflow.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 transition-all hover:bg-slate-50/80">
                        <div className="mb-4 flex items-center justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-100" style={{ color: item.color }}>
                              <Icon size={15} />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-slate-800">{item.label}</p>
                              <p className="mt-1 text-[11px] font-mono text-slate-400">{item.sub}</p>
                            </div>
                          </div>
                          <span className="shrink-0 text-[11px] font-mono font-black text-slate-500">{item.value}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${item.bar}`} style={{ backgroundColor: item.color }} />
                        </div>
                      </div>
                    );
                  })}

                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        <p className="text-xs font-bold text-slate-700">Status: Active Evaluation Workspace Ready</p>
                      </div>
                      <Link href="/evaluate" className="text-xs font-black text-indigo-600 hover:text-indigo-500">
                        Launch &rarr;
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4 text-[10px] font-mono text-slate-400">
                  <span>PrepForge Engine v2.0</span>
                  <span>System status - <span className="text-emerald-500 font-bold">Online</span></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards Section */}
        <section id="evaluation" className="relative border-y border-slate-150/80 bg-white px-5 py-24">
          <div className="mx-auto grid max-w-[1180px] gap-6 lg:grid-cols-2">
            {evaluationCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="stagger-card opacity-0 rounded-3xl border border-slate-200/70 bg-[#FCFCFE] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_18px_45px_rgba(79,70,229,0.05)] hover:border-indigo-100 hover:-translate-y-1">
                  <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border shadow-sm ${card.color}`}>
                    <Icon size={24} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">{card.badge}</span>
                  <h2 className="mt-2 text-2.5xl font-black tracking-tight text-slate-800">{card.title}</h2>
                  <p className="mt-4 text-base font-medium leading-8 text-slate-500">{card.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* Flow timeline */}
        <section id="workflow" className="px-5 py-24 bg-[#FAF9FC]">
          <div className="mx-auto max-w-[1180px]">
            <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">HOW IT WORKS</p>
                <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">One console for paper checking</h2>
              </div>
              <p className="max-w-xl text-base font-medium leading-7 text-slate-500">
                Simply upload images of student answer sheets and a marking key, let Gemini extract the responses, grade each step, analyze gaps, and generate downloadable reports.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Upload, title: "1. Upload", text: "Scanned answer sheets, OMR forms, keys, or custom rubrics." },
                { icon: Brain, title: "2. Grade", text: "Evaluate responses based on strict grading criteria with exact quotes." },
                { icon: BarChart3, title: "3. Analyze", text: "Map topic-wise concept gaps, accuracies, and ranks." },
                { icon: FileBadge, title: "4. Report", text: "Download beautiful HTML/PDF reports customized for parents." },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:shadow-lg hover:border-indigo-100">
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100/50 text-indigo-600">
                      <Icon size={19} />
                    </div>
                    <h3 className="text-lg font-black text-slate-800">{item.title}</h3>
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-500">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Demo/College-ready block */}
        <section id="reports" className="px-5 pb-24 bg-[#FAF9FC]">
          <div className="mx-auto grid max-w-[1180px] gap-6 lg:grid-cols-[.95fr_1.05fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 flex flex-col justify-between">
              <div>
                <ShieldCheck className="mb-6 text-indigo-600" size={32} />
                <h2 className="text-3xl font-black tracking-tight text-slate-800">Production-ready suite with file fallback</h2>
                <p className="mt-4 text-base font-medium leading-8 text-slate-500">
                  PrepForge handles evaluation records seamlessly. When a database is not configured, it records local evaluation logs to the filesystem (`local_history.json`), keeping the workspace clean and fast for demos.
                </p>
              </div>
              <Link
                href="/evaluate"
                className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-indigo-600 px-7 text-sm font-black text-white shadow-[0_4px_15px_rgba(79,70,229,0.2)] hover:bg-indigo-500 w-fit"
              >
                Launch Console <ArrowRight size={16} />
              </Link>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">Automated Report Preview</p>
                  <h3 className="mt-1.5 text-xl font-black text-slate-800">Aarav Sharma — JEE Batch</h3>
                </div>
                <BadgeCheck className="text-emerald-500" size={24} />
              </div>

              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                {reportStats.map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="text-xl font-black text-slate-800">{value}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {[
                  ["Strengths", "Mechanics, Calculus, Electrochemistry"],
                  ["Weaknesses", "Ray optics sign conventions"],
                  ["Suggestions", "Practice derivation steps and sign rules"],
                  ["Learning Pattern", "High numerical confidence, missing units"],
                ].map(([label, text]) => (
                  <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50/30 p-4">
                    <p className="mb-1.5 text-xs font-black uppercase tracking-[0.18em] text-indigo-600">{label}</p>
                    <p className="text-sm font-semibold leading-6 text-slate-600">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
