"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
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
  },
  {
    icon: ScanLine,
    title: "OMR Evaluation",
    text: "Faculty uploads the answer key and OMR sheets. PrepForge checks responses, calculates scores, and creates detailed accuracy, subject-wise performance, and rank analysis reports.",
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
  return (
    <>
      <Navbar />
      <main className="min-h-screen overflow-x-hidden bg-[#03040A] text-white">
        <section className="relative min-h-[860px] px-5 pb-20 pt-28 md:min-h-[780px] md:pt-36">
          <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.56]"
            style={{ backgroundImage: "url('/assets/main-page.jpg')" }}
          />
          <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_42%_35%,rgba(124,111,224,0.08),transparent_28%),linear-gradient(90deg,#03040A_0%,rgba(3,4,10,0.55)_42%,#03040A_100%)]" />
          <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(3,4,10,0.22)_42%,#03040A_100%)]" />

          <div className="relative z-10 mx-auto grid max-w-[1180px] items-center gap-12 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:pt-24">
            <div>
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#7768DA]/30 bg-[#151225]/82 px-4 py-2 text-[11px] font-bold text-[#B3AAFF] shadow-[0_0_26px_rgba(124,111,224,0.16)] backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-[#8B7FE8] shadow-[0_0_12px_rgba(139,127,232,0.95)]" />
                Descriptive + OMR evaluation now available
              </div>

              <h1 className="max-w-[620px] text-[4.15rem] font-black leading-[1.06] tracking-[-0.04em] text-white drop-shadow-[0_10px_34px_rgba(0,0,0,0.55)] sm:text-[5.6rem] lg:text-[5.8rem]">
                Evaluate JEE &amp; NEET
                <span className="block text-[#8D7BFF]">answers like experts.</span>
              </h1>

              <p className="mt-8 max-w-[620px] text-[17px] font-semibold leading-8 text-[#A2A6BA]">
                PrepForge helps faculty upload scanned answer sheets, check OMRs,
                generate AI marks, identify topic-wise gaps, and export college-ready
                student reports.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/evaluate"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#7C6FE0] px-9 text-[15px] font-black text-white shadow-[0_0_42px_rgba(124,111,224,0.5)] transition hover:bg-[#9386FF]"
                >
                  Start Evaluating Free <ArrowRight size={17} />
                </Link>
                <Link
                  href="#workflow"
                  className="inline-flex h-14 items-center justify-center rounded-full border border-[#2A2D3C] bg-white/[0.035] px-9 text-[15px] font-black text-white backdrop-blur transition hover:border-[#565B78] hover:bg-white/[0.07]"
                >
                  See Evaluation Flow
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-8 rounded-[2.5rem] bg-[#7C6FE0]/10 blur-3xl" />
              <div className="relative overflow-hidden rounded-[1.45rem] border border-[#191B2A] bg-[#070813]/92 shadow-[0_35px_90px_rgba(0,0,0,0.62)] backdrop-blur-xl">
                <div className="flex h-[58px] items-center justify-between border-b border-[#161827] bg-[#05060D] px-6">
                  <div className="flex gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#FF5656]" />
                    <span className="h-3 w-3 rounded-full bg-[#FACC15]" />
                    <span className="h-3 w-3 rounded-full bg-[#22C55E]" />
                  </div>
                  <div className="rounded-full border border-[#453C7A] bg-[#111126] px-6 py-2 text-[11px] font-black text-[#D8D4FF]">
                    PrepForge - Faculty 2026
                  </div>
                  <div className="w-[52px]" />
                </div>

                <div className="space-y-4 p-6">
                  {workflow.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-2xl border border-[#202235] bg-[#11111F]/88 p-4">
                        <div className="mb-4 flex items-center justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1830]" style={{ color: item.color }}>
                              <Icon size={16} />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-white">{item.label}</p>
                              <p className="mt-1 text-[11px] font-mono text-[#5F6379]">{item.sub}</p>
                            </div>
                          </div>
                          <span className="shrink-0 text-[11px] font-mono font-black text-[#8D91A8]">{item.value}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#242638]">
                          <div className={`h-full rounded-full ${item.bar}`} style={{ backgroundColor: item.color }} />
                        </div>
                      </div>
                    );
                  })}

                  <div className="rounded-2xl border border-[#252142] bg-[#15132A]/95 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full bg-[#22C55E] shadow-[0_0_14px_rgba(34,197,94,0.8)]" />
                        <p className="text-sm font-black text-white">Live: OMR + Descriptive Batch</p>
                      </div>
                      <Link href="/evaluate" className="text-xs font-black text-[#B4AAFF]">
                        Open -
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#161827] bg-[#05060D] px-6 py-4 text-[10px] font-mono text-[#5E6378]">
                  <span>PrepForge Dashboard</span>
                  <span>Faculty Suite - <span className="text-[#22C55E]">On Track</span></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="evaluation" className="relative border-y border-[#151827] bg-[#05060D] px-5 py-18">
          <div className="mx-auto grid max-w-[1180px] gap-5 lg:grid-cols-2">
            {evaluationCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="rounded-3xl border border-[#191B2A] bg-[#0A0B16] p-8 shadow-[0_22px_70px_rgba(0,0,0,0.28)]">
                  <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7C6FE0]/14 text-[#9D8DFF]">
                    <Icon size={26} />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-white">{card.title}</h2>
                  <p className="mt-4 text-base font-medium leading-8 text-[#9DA1B6]">{card.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="workflow" className="bg-[#03040A] px-5 py-20">
          <div className="mx-auto max-w-[1180px]">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[#8D7BFF]">How it works</p>
                <h2 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">One faculty flow for every paper</h2>
              </div>
              <p className="max-w-xl text-sm font-semibold leading-7 text-[#858BA4]">
                Upload answer sheets and model answers, generate scores and feedback,
                then combine OMR accuracy, subject performance, and ranks into reports.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Upload, title: "Upload", text: "Scanned sheets, images, model answers, OMR keys." },
                { icon: Brain, title: "Evaluate", text: "Marks based on predefined criteria and answer evidence." },
                { icon: BarChart3, title: "Analyze", text: "Topic gaps, learning patterns, accuracy, rank analysis." },
                { icon: FileBadge, title: "Report", text: "PDF-ready student and class report summaries." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-3xl border border-[#191B2A] bg-[#0A0B16] p-6 transition hover:border-[#7564E8]/45">
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#171329] text-[#9D8DFF]">
                      <Icon size={21} />
                    </div>
                    <h3 className="text-lg font-black text-white">{item.title}</h3>
                    <p className="mt-3 text-sm font-medium leading-6 text-[#8A8FA6]">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="reports" className="px-5 pb-20">
          <div className="mx-auto grid max-w-[1180px] gap-5 lg:grid-cols-[.9fr_1.1fr]">
            <div className="rounded-3xl border border-[#191B2A] bg-[#0A0B16] p-8">
              <ShieldCheck className="mb-6 text-[#9D8DFF]" size={34} />
              <h2 className="text-3xl font-black tracking-tight text-white">College-ready demo, no database needed.</h2>
              <p className="mt-4 text-base font-medium leading-8 text-[#9DA1B6]">
                Static data keeps the demo fast for investors and colleges. An automatic local filesystem
                fallback saves evaluation history directly in the workspace, while Gemini handles grounded marks and feedback when env keys are present.
              </p>
              <Link
                href="/evaluate"
                className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#7C6FE0] px-7 text-sm font-black text-white shadow-[0_0_34px_rgba(124,111,224,0.36)]"
              >
                Open Faculty Console <ArrowRight size={16} />
              </Link>
            </div>

            <div className="rounded-3xl border border-[#191B2A] bg-[#0A0B16] p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8D7BFF]">Student Report</p>
                  <h3 className="mt-1 text-xl font-black text-white">Aarav Sharma - JEE Batch</h3>
                </div>
                <BadgeCheck className="text-[#22C55E]" size={25} />
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                {reportStats.map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-[#202235] bg-[#11111F] p-4">
                    <p className="text-xl font-black text-white">{value}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#686D83]">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {[
                  ["Strengths", "Mechanics, Calculus, Electrochemistry"],
                  ["Weaknesses", "Ray optics, organic substitution"],
                  ["Suggestions", "Practice derivations and NCERT-based MCQs"],
                  ["Learning Pattern", "Concept clear, step marking needs improvement"],
                ].map(([label, text]) => (
                  <div key={label} className="rounded-2xl border border-[#202235] bg-[#11111F] p-4">
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#8D7BFF]">{label}</p>
                    <p className="text-sm font-semibold leading-6 text-[#B3B7C8]">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
