"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  FileBadge,
  FileText,
  GraduationCap,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";

const demoSteps = [
  { icon: GraduationCap, title: "Faculty Login", text: "Clerk-secured access for verified college faculty and exam teams." },
  { icon: Upload, title: "Upload Answer Sheet", text: "Drop handwritten PDFs, scanned answer sheets, or class bundles." },
  { icon: FileText, title: "Upload Model Answer", text: "Attach the marking scheme, rubric, and official solution key." },
  { icon: Brain, title: "AI Marks Generate", text: "Gemini-powered rubric scoring with retrieval-backed evidence checks." },
  { icon: ClipboardCheck, title: "Feedback Generate", text: "Personalized improvement notes for JEE and NEET students." },
  { icon: ScanLine, title: "OMR Checking", text: "Static demo flow for MCQ bubble checking, accuracy, and penalties." },
  { icon: FileBadge, title: "Student Report PDF", text: "Investor-ready report preview with marks, feedback, and topic gaps." },
];

const metrics = [
  ["3 min", "evaluation turnaround"],
  ["7-step", "faculty workflow"],
  ["JEE/NEET", "demo-ready streams"],
  ["0 DB", "static investor demo"],
];

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen overflow-x-hidden bg-[#05070A] text-[#F6F7FB]">
        <section className="relative px-6 pb-20 pt-32 md:pb-28 md:pt-44">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_15%,rgba(20,184,166,0.22),transparent_30%),radial-gradient(circle_at_82%_20%,rgba(244,114,182,0.18),transparent_30%),linear-gradient(135deg,#05070A_0%,#0B1014_45%,#06110F_100%)]" />
          <div
            className="absolute inset-0 -z-10 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)",
              backgroundSize: "46px 46px",
            }}
          />

          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.02fr_.98fr]">
            <div>
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-teal-200">
                <Sparkles size={14} />
                Faculty AI Evaluation Suite
              </div>

              <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-tight text-white md:text-7xl">
                PrepForge for college answer sheet evaluation.
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
                A sharp demo for investors and institutions: faculty login, answer sheet upload,
                model answer upload, AI marks, feedback, OMR checking, and student report PDFs.
              </p>

              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/evaluate"
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-teal-300 px-7 text-sm font-black text-[#04100E] shadow-[0_18px_60px_rgba(45,212,191,0.24)] transition hover:bg-teal-200"
                >
                  Open Faculty Demo <ArrowRight size={17} />
                </Link>
                <Link
                  href="#workflow"
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-7 text-sm font-bold text-white transition hover:border-white/20 hover:bg-white/[0.07]"
                >
                  View Workflow
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[#08100F]/88 p-5 shadow-2xl backdrop-blur">
              <div className="rounded-3xl border border-white/10 bg-[#0B1514] p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-200">Live Demo</p>
                    <h2 className="mt-1 text-xl font-black text-white">Class XII Mock Test</h2>
                  </div>
                  <div className="rounded-xl bg-emerald-400/15 px-3 py-2 text-xs font-black text-emerald-200">
                    Ready
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {[
                    ["Answer sheets", "42 PDFs uploaded", "100%"],
                    ["Model answer", "Rubric parsed", "96%"],
                    ["OMR scan", "180 bubbles checked", "91%"],
                    ["Report PDF", "3 student reports queued", "Ready"],
                  ].map(([label, detail, value]) => (
                    <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-white">{label}</p>
                          <p className="mt-1 text-xs text-slate-400">{detail}</p>
                        </div>
                        <span className="text-sm font-black text-teal-200">{value}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-pink-300/15 bg-pink-300/8 p-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="text-pink-200" size={20} />
                    <p className="text-sm font-bold text-white">RAG guardrails active</p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Marks and feedback are constrained to uploaded answer context, model answer,
                    rubric, and OMR key. Low confidence returns a review warning.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/8 bg-[#07100F] px-6 py-8">
          <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                <p className="text-2xl font-black text-white">{value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="workflow" className="px-6 py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-200">Bas ye enough hai</p>
                <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">Investor-ready workflow</h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-slate-400">
                The app is intentionally static for now: no database dependency, just Clerk auth,
                upload previews, Gemini evaluation, OMR simulation, and PDF-ready report UI.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {demoSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="rounded-2xl border border-white/8 bg-[#0A1110] p-6 transition hover:border-teal-300/30">
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-300/12 text-teal-200">
                      <Icon size={21} />
                    </div>
                    <h3 className="text-lg font-black text-white">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{step.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-6 pb-20">
          <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-3">
            {[
              { icon: BadgeCheck, title: "College Demo", text: "Show full evaluation journey without needing backend setup." },
              { icon: BarChart3, title: "Faculty Control", text: "Marks, confidence, topic gaps, class rank, and report actions in one console." },
              { icon: CheckCircle2, title: "Future Features", text: "Database, real OCR, bulk PDF export, audit logs, and institutional dashboards can come next." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
                  <Icon className="mb-4 text-pink-200" size={24} />
                  <h3 className="text-lg font-black text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.text}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
