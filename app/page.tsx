"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import {
  FileText,
  ScanLine,
  Brain,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  BookOpen,
  Quote,
  Sparkles,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, AnimatePresence } from "framer-motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA FOR SECTIONS
// ─────────────────────────────────────────────────────────────────────────────

const featuresList = [
  {
    icon: <FileText className="w-6 h-6 text-[#7C3AED]" />,
    title: "Step-wise Descriptive Evaluation",
    desc: "AI transcribes and evaluates handwritten answer pages line-by-line, aligning awarded marks directly to specific rubric points with precise citation evidence.",
    badge: "DESCRIPTIVE",
    accent: "purple",
  },
  {
    icon: <ScanLine className="w-6 h-6 text-[#F97316]" />,
    title: "OMR Bubble Sheet Auditor",
    desc: "Processes bubble scans instantly to flag double-shading, blank rows, and light marking anomalies while scoring against reference answer keys.",
    badge: "OMR AUDIT",
    accent: "orange",
  },
  {
    icon: <Brain className="w-6 h-6 text-[#7C3AED]" />,
    title: "Chain-of-Thought Rubric Logic",
    desc: "AI traces derivation equations, NCERT matching terminology, and numerical steps to produce clear explanations of why marks were awarded or deducted.",
    badge: "AI GRADER",
    accent: "purple",
  },
  {
    icon: <BarChart3 className="w-6 h-6 text-[#F97316]" />,
    title: "Syllabus Gap Mining",
    desc: "Aggregates grading results to automatically plot precise concept weaknesses, generating personalized revision and practice recommendations.",
    badge: "GAP ANALYSIS",
    accent: "orange",
  },
];

const stepsList = [
  {
    num: "01",
    title: "Secure Authentication",
    desc: "Access the dashboard through secure, Clerk-protected login credentials dedicated for faculty members.",
  },
  {
    num: "02",
    title: "Configure Parameters",
    desc: "Set up the target student configuration modal including roll number, batch, stream, subject, and exam rules.",
  },
  {
    num: "03",
    title: "Upload Documents",
    desc: "Drag and drop the student answer sheets, reference answer key, or your custom marking rubric files.",
  },
  {
    num: "04",
    title: "Review AI Report",
    desc: "Get an instantaneous, citation-backed grading report mapping scores, anomalies, concept gaps, and recommendations.",
  },
];

const testimonialsList = [
  {
    quote: "PrepForge reduced our weekly descriptive grading cycle from three days of manual work to under twenty minutes. The step-wise citation system makes it easy for us to verify every single marked answer.",
    author: "Dr. Ramesh Iyer",
    role: "Senior Physics Faculty, FIITJEE",
  },
  {
    quote: "Our institute processed thousands of OMR bubble sheets last month. The anomaly detection is incredibly accurate, automatically highlighting faint shading errors that standard scanners completely missed.",
    author: "Prof. Anjali Sen",
    role: "HOD Chemistry, Allen Career Institute",
  },
  {
    quote: "Finally, an AI grading system that doesn't just output a single arbitrary number. PrepForge provides clear, NCERT-aligned explanations for every deduction, which helps our students target exactly what to revise.",
    author: "Maths & Science Coordinator",
    role: "Sri Chaitanya Academy",
  },
];

const faqsList = [
  {
    q: "How does the grading engine evaluate handwritten formulas and mathematical equations?",
    a: "The grading pipeline leverages multi-provider OCR to transcribe handwritten text and equations. The evaluation system then checks the intermediate derivations, variables, sign conventions, and numerical units against your custom marking key steps.",
  },
  {
    q: "Can we upload our own custom marking criteria or NCERT-specific keys?",
    a: "Yes. You can upload any standard PDF marking key or input your custom scoring instructions directly. The AI dynamically aligns its grading logic to your criteria.",
  },
  {
    q: "How secure is the scanned paper data and student academic information?",
    a: "All scanned documents, transcribed texts, and evaluation reports are encrypted. We utilize secure authentication through Clerk and restrict database record access strictly to authorized faculty members.",
  },
  {
    q: "Is there a limit to how many OMR sheets we can check at once?",
    a: "No. The OMR auditor is designed for bulk parallel processing. You can upload dozens of sheets at once, and the system evaluates them concurrently in seconds.",
  },
];

function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 py-6 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left font-semibold text-[#0F172A] hover:text-[#7C3AED] transition-colors cursor-pointer group"
      >
        <span className="text-base md:text-lg pr-4">{question}</span>
        <span className="shrink-0 p-1 rounded-full bg-slate-50 group-hover:bg-[#7C3AED]/5 transition-colors">
          <ChevronDown
            size={18}
            className={`text-slate-400 group-hover:text-[#7C3AED] transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="text-sm md:text-base text-slate-600 mt-3 leading-relaxed">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CleanPremiumLanding() {
  useEffect(() => {
    // Elegant fade-in reveals for page sections using GSAP
    const sections = document.querySelectorAll(".reveal-section");
    sections.forEach((sec) => {
      gsap.fromTo(
        sec,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sec,
            start: "top bottom-=80",
            toggleActions: "play none none none",
          },
        }
      );
    });
  }, []);

  return (
    <div className="bg-white text-slate-900 min-h-screen font-sans selection:bg-[#7C3AED]/10 selection:text-[#7C3AED]">
      <Navbar />

      {/* ───────────────────────────────────────────────────────────────────────
          1. HERO SECTION
          ─────────────────────────────────────────────────────────────────────── */}
      <section 
        style={{ paddingTop: "144px", paddingBottom: "96px", paddingLeft: "24px", paddingRight: "24px" }}
        className="relative bg-white flex flex-col items-center text-center overflow-hidden w-full"
      >
        <div className="max-w-4xl z-10 flex flex-col items-center w-full">
          {/* Subtle Accent Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-100 bg-slate-50 text-[#7C3AED] text-xs font-semibold uppercase tracking-wider mb-6 shadow-sm">
            <Sparkles size={13} className="text-[#7C3AED]" />
            AI Evaluation Console
          </div>

          {/* Premium Clean Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#0F172A] leading-[1.2] mb-6 max-w-3xl w-full">
            AI-powered answer sheet grading and OMR evaluation for educators.
          </h1>

          {/* Clear Slate Subtext */}
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl leading-relaxed mb-10 w-full">
            Streamline step-by-step descriptive exam marking and bubble-sheet verification. 
            Grade handwriting with citation audits, map conceptual syllabus gaps, and reclaim valuable prep hours.
          </p>

          {/* Clean Accent-Colored CTA Button */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full">
            <Link
              href="/evaluate"
              className="px-8 py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg font-semibold text-base shadow-sm transition-all flex items-center gap-2 group cursor-pointer"
            >
              Open Faculty Console
              <ArrowRight size={18} className="transform group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#features"
              className="px-8 py-4 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-lg font-semibold text-base shadow-sm transition-all cursor-pointer"
            >
              Explore Features
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          2. FEATURES SECTION (Clean Equal-Height Grid)
          ─────────────────────────────────────────────────────────────────────── */}
      <section 
        style={{ paddingTop: "96px", paddingBottom: "96px", paddingLeft: "24px", paddingRight: "24px" }}
        className="reveal-section max-w-7xl mx-auto border-t border-slate-100 bg-white w-full" 
        id="features"
      >
        <div className="text-center max-w-2xl mx-auto mb-16 w-full">
          <h2 className="text-xs font-bold text-[#7C3AED] uppercase tracking-widest mb-3">Capabilities</h2>
          <h3 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] tracking-tight">
            High-Precision Grading Features
          </h3>
          <p className="text-slate-600 mt-2">
            Automate routine validation tasks while maintaining full grading accuracy and transparency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {featuresList.map((feat, idx) => (
            <div
              key={idx}
              className="border border-slate-200 rounded-xl p-8 hover:border-slate-350 transition-all duration-205 flex flex-col justify-between bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
            >
              <div>
                <div className="inline-flex items-center gap-2 mb-6">
                  <span
                    className={`inline-block text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                      feat.accent === "orange"
                        ? "bg-orange-50 text-[#F97316]"
                        : "bg-purple-50 text-[#7C3AED]"
                    }`}
                  >
                    {feat.badge}
                  </span>
                </div>
                <h4 className="text-xl font-bold text-[#0F172A] mb-3">{feat.title}</h4>
                <p className="text-slate-600 text-sm md:text-base leading-relaxed">{feat.desc}</p>
              </div>
              <div className="mt-8 flex justify-between items-center pt-4 border-t border-slate-50 w-full">
                <div className="p-2.5 rounded-lg bg-slate-50">
                  {feat.icon}
                </div>
                <Link
                  href="/evaluate"
                  className={`text-sm font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    feat.accent === "orange"
                      ? "text-[#F97316] hover:text-[#EA580C]"
                      : "text-[#7C3AED] hover:text-[#6D28D9]"
                  }`}
                >
                  Try Now <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          3. BEFORE / AFTER SECTION
          ─────────────────────────────────────────────────────────────────────── */}
      <section 
        style={{ paddingTop: "96px", paddingBottom: "96px", paddingLeft: "24px", paddingRight: "24px" }}
        className="reveal-section bg-slate-50/50 border-t border-b border-slate-100 w-full"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center max-w-2xl mx-auto mb-16 w-full">
            <h2 className="text-xs font-bold text-[#F97316] uppercase tracking-widest mb-3">Contrast</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              A Smarter Grading Workflow
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 w-full">
            {/* The Pain (Manual Paper Grading) */}
            <div className="bg-white border border-slate-200 p-8 md:p-12 rounded-xl flex flex-col justify-between relative overflow-hidden shadow-sm">
              <div className="absolute top-0 left-0 right-0 h-[4px] bg-[#F97316]" />
              <div>
                <span className="text-[#F97316] font-bold text-xs uppercase tracking-wider block mb-4">Manual Grading Process</span>
                <h4 className="text-2xl font-bold text-[#0F172A] mb-6">Stack & Pen Verification</h4>
                
                <ul className="space-y-5">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-orange-50 text-[#F97316] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">✗</span>
                    <div>
                      <p className="font-semibold text-[#0F172A] text-sm md:text-base">Inconsistent step marking</p>
                      <p className="text-xs md:text-sm text-slate-600 mt-1">Applying grading rules uniformly over hours of late-night grading is prone to fatigue errors.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-orange-50 text-[#F97316] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">✗</span>
                    <div>
                      <p className="font-semibold text-[#0F172A] text-sm md:text-base">OMR audit oversights</p>
                      <p className="text-xs md:text-sm text-slate-600 mt-1">Faint bubbles, erase marks, and multiple selections trigger zero warnings and get miscounted by baseline scanners.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-orange-50 text-[#F97316] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">✗</span>
                    <div>
                      <p className="font-semibold text-[#0F172A] text-sm md:text-base">Missing concept analysis</p>
                      <p className="text-xs md:text-sm text-slate-600 mt-1">Students only see raw numeric scores. Teachers get no structured reports on syllabus topics requiring attention.</p>
                    </div>
                  </li>
                </ul>
              </div>
              <p className="text-xs text-slate-400 mt-8 border-t border-slate-100 pt-4">Manual speed average: 12-15 answer sheets per hour.</p>
            </div>

            {/* The Solution (PrepForge AI Grading) */}
            <div className="bg-white border border-slate-300 p-8 md:p-12 rounded-xl flex flex-col justify-between relative overflow-hidden shadow-[0_4px_20px_rgba(15,23,42,0.03)] ring-2 ring-[#7C3AED]/10">
              <div className="absolute top-0 left-0 right-0 h-[4px] bg-[#7C3AED]" />
              <div>
                <span className="text-[#7C3AED] font-bold text-xs uppercase tracking-wider block mb-4">PrepForge Console</span>
                <h4 className="text-2xl font-bold text-[#0F172A] mb-6">AI-Powered Evaluation Suite</h4>
                
                <ul className="space-y-5">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-purple-50 text-[#7C3AED] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">✓</span>
                    <div>
                      <p className="font-semibold text-[#0F172A] text-sm md:text-base">Step-wise evidence matching</p>
                      <p className="text-xs md:text-sm text-slate-600 mt-1">Every mark awarded is linked to specific lines on the student's sheet and mapped directly to your custom rubric guidelines.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-purple-50 text-[#7C3AED] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">✓</span>
                    <div>
                      <p className="font-semibold text-[#0F172A] text-sm md:text-base">Visual bubble audits</p>
                      <p className="text-xs md:text-sm text-slate-600 mt-1">AI models detect faint shading patterns and double-bubbled selections, flagging them for rapid faculty confirmation.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-purple-50 text-[#7C3AED] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">✓</span>
                    <div>
                      <p className="font-semibold text-[#0F172A] text-sm md:text-base">Instant concept gap tracking</p>
                      <p className="text-xs md:text-sm text-slate-600 mt-1">Generates real-time, topic-wise analysis dashboards charting cohorts' structural gaps with NCERT revision tips.</p>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between w-full">
                <p className="text-xs text-slate-400">Processing speed average: 180 documents per minute.</p>
                <Link href="/evaluate" className="text-xs font-bold text-[#7C3AED] hover:text-[#6D28D9] flex items-center gap-1 cursor-pointer">
                  Launch Console <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          4. HOW IT WORKS SECTION (Simple, Stackable Steps)
          ─────────────────────────────────────────────────────────────────────── */}
      <section 
        style={{ paddingTop: "96px", paddingBottom: "96px", paddingLeft: "24px", paddingRight: "24px" }}
        className="reveal-section bg-white w-full" 
        id="workflow"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center max-w-2xl mx-auto mb-16 w-full">
            <h2 className="text-xs font-bold text-[#7C3AED] uppercase tracking-widest mb-3">Workflow</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              Minimalist 4-Step Process
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
            {stepsList.map((step, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 hover:border-slate-350 p-6 rounded-xl flex flex-col justify-between transition-all duration-200"
              >
                <div>
                  <span className="text-4xl font-black text-slate-100 tracking-tight block mb-4">
                    {step.num}
                  </span>
                  <h4 className="text-lg font-bold text-[#0F172A] mb-2">{step.title}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          5. STATISTICS SECTION
          ─────────────────────────────────────────────────────────────────────── */}
      <section 
        style={{ paddingTop: "80px", paddingBottom: "80px", paddingLeft: "24px", paddingRight: "24px" }}
        className="reveal-section bg-slate-50/50 border-t border-b border-slate-100 w-full"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center w-full">
            <div className="p-4">
              <p className="text-4xl md:text-5xl font-black text-[#0F172A] mb-2 tracking-tight">
                99.2%
              </p>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Grading Accuracy</h4>
              <p className="text-xs text-slate-400 mt-2 max-w-[200px] mx-auto">Verified against rigorous standard test keys.</p>
            </div>
            <div className="p-4 border-y md:border-y-0 md:border-x border-slate-200">
              <p className="text-4xl md:text-5xl font-black text-[#0F172A] mb-2 tracking-tight">
                150,000+
              </p>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Sheets Checked</h4>
              <p className="text-xs text-slate-400 mt-2 max-w-[200px] mx-auto">Active papers processed by faculty platforms.</p>
            </div>
            <div className="p-4">
              <p className="text-4xl md:text-5xl font-black text-[#0F172A] mb-2 tracking-tight">
                85%
              </p>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Time Saved</h4>
              <p className="text-xs text-slate-400 mt-2 max-w-[200px] mx-auto">Valuable prep hours redirected back to students.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          6. TESTIMONIALS SECTION (Static Grid, Clean Text Wrapping)
          ─────────────────────────────────────────────────────────────────────── */}
      <section 
        style={{ paddingTop: "96px", paddingBottom: "96px", paddingLeft: "24px", paddingRight: "24px" }}
        className="reveal-section bg-white w-full" 
        id="testimonials"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center max-w-2xl mx-auto mb-16 w-full">
            <h2 className="text-xs font-bold text-[#7C3AED] uppercase tracking-widest mb-3">Feedback</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              Trusted by Faculty
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
            {testimonialsList.map((t, i) => (
              <div
                key={i}
                className="border border-slate-200 p-8 rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col justify-between hover:border-slate-350 transition-colors"
              >
                <div>
                  <Quote size={28} className="text-[#7C3AED]/10 mb-6" />
                  <p className="text-slate-600 text-sm md:text-base leading-relaxed italic mb-8 whitespace-normal">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-50 w-full">
                  <h5 className="font-bold text-[#0F172A] text-sm md:text-base">{t.author}</h5>
                  <p className="text-xs text-slate-400 mt-1">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          7. PRICING SECTION
          ─────────────────────────────────────────────────────────────────────── */}
      <section 
        style={{ paddingTop: "96px", paddingBottom: "96px", paddingLeft: "24px", paddingRight: "24px" }}
        className="reveal-section bg-slate-50/50 border-t border-b border-slate-100 w-full" 
        id="pricing"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center max-w-2xl mx-auto mb-16 w-full">
            <h2 className="text-xs font-bold text-[#7C3AED] uppercase tracking-widest mb-3">Pricing</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              Transparent Institutional Plans
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto w-full">
            {/* Basic Plan */}
            <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col justify-between shadow-sm">
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Starter Portal</h4>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-[#0F172A]">$79</span>
                  <span className="text-sm text-slate-400 font-medium">/ month</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 size={16} className="text-[#F97316] shrink-0 mt-0.5" />
                    <span>Process up to 100 descriptive papers/mo</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 size={16} className="text-[#F97316] shrink-0 mt-0.5" />
                    <span>Basic handwriting OCR mapping</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 size={16} className="text-[#F97316] shrink-0 mt-0.5" />
                    <span>Standard OMR checking (50 sheets/mo)</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 size={16} className="text-[#F97316] shrink-0 mt-0.5" />
                    <span>Basic gap analysis dashboard</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/evaluate"
                className="w-full text-center py-3 px-6 rounded-lg text-sm font-semibold bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 transition-colors block cursor-pointer"
              >
                Get Started
              </Link>
            </div>

            {/* Pro Plan (Highlighted) */}
            <div className="bg-white border-2 border-[#7C3AED] rounded-xl p-8 flex flex-col justify-between shadow-md relative">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#7C3AED] text-white text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider">
                MOST POPULAR
              </span>
              <div>
                <h4 className="text-sm font-bold text-[#7C3AED] uppercase tracking-wider mb-2">Pro Faculty</h4>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-[#0F172A]">$189</span>
                  <span className="text-sm text-slate-400 font-medium">/ month</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 size={16} className="text-[#7C3AED] shrink-0 mt-0.5" />
                    <span>Unlimited descriptive answer sheets</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 size={16} className="text-[#7C3AED] shrink-0 mt-0.5" />
                    <span>Chain-of-Thought AI grading logic</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 size={16} className="text-[#7C3AED] shrink-0 mt-0.5" />
                    <span>Unlimited OMR + anomaly auditing</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 size={16} className="text-[#7C3AED] shrink-0 mt-0.5" />
                    <span>Advanced cohort gap analytics</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 size={16} className="text-[#7C3AED] shrink-0 mt-0.5" />
                    <span>HTML/PDF evaluation reports export</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/evaluate"
                className="w-full text-center py-3 px-6 rounded-lg text-sm font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors block cursor-pointer shadow-sm"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col justify-between shadow-sm">
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Enterprise System</h4>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-[#0F172A]">$449</span>
                  <span className="text-sm text-slate-400 font-medium">/ month</span>
                </div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 size={16} className="text-[#F97316] shrink-0 mt-0.5" />
                    <span>Institutional API integration layer</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 size={16} className="text-[#F97316] shrink-0 mt-0.5" />
                    <span>Unified billing for department profiles</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 size={16} className="text-[#F97316] shrink-0 mt-0.5" />
                    <span>SLA guaranteed uptime and support</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 size={16} className="text-[#F97316] shrink-0 mt-0.5" />
                    <span>Dedicated account training & support</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/evaluate"
                className="w-full text-center py-3 px-6 rounded-lg text-sm font-semibold bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 transition-colors block cursor-pointer"
              >
                Contact Institution Team
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          8. FAQ SECTION (Accordion list)
          ─────────────────────────────────────────────────────────────────────── */}
      <section 
        style={{ paddingTop: "96px", paddingBottom: "96px", paddingLeft: "24px", paddingRight: "24px" }}
        className="reveal-section max-w-4xl mx-auto bg-white w-full" 
        id="faq"
      >
        <div className="text-center max-w-2xl mx-auto mb-16 w-full">
          <h2 className="text-xs font-bold text-[#7C3AED] uppercase tracking-widest mb-3">FAQ</h2>
          <h3 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Frequently Asked Questions
          </h3>
        </div>

        <div className="divide-y divide-slate-100 w-full">
          {faqsList.map((faq, index) => (
            <AccordionItem key={index} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          9. FOOTER SECTION
          ─────────────────────────────────────────────────────────────────────── */}
      <footer 
        style={{ paddingTop: "64px", paddingBottom: "64px", paddingLeft: "24px", paddingRight: "24px" }}
        className="bg-white max-w-7xl mx-auto border-t border-slate-100 w-full"
      >
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 pb-12 mb-8 w-full">
          <div>
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-[#0F172A] mb-3">
              <span className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center text-white shadow-sm">
                <BookOpen size={16} strokeWidth={2.5} />
              </span>
              Prep<span className="text-[#7C3AED]">Forge</span>
            </Link>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
              Automated high-precision answer verification and OMR auditing suite for JEE &amp; NEET institutes.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-16 gap-y-6">
            <div>
              <h5 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest mb-4">Product</h5>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/evaluate" className="text-slate-500 hover:text-[#7C3AED] transition-colors">
                    Faculty Console
                  </Link>
                </li>
                <li>
                  <Link href="#features" className="text-slate-500 hover:text-[#7C3AED] transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#workflow" className="text-slate-500 hover:text-[#7C3AED] transition-colors">
                    How it works
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest mb-4">Company</h5>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="text-slate-500 hover:text-[#7C3AED] transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="mailto:support@prepforge.com" className="text-slate-500 hover:text-[#7C3AED] transition-colors">
                    Support Desk
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400 pt-8 border-t border-slate-50 w-full">
          <p>&copy; {new Date().getFullYear()} PrepForge. All Rights Reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-slate-600 transition-colors">Terms of Use</Link>
            <Link href="/privacy" className="hover:text-slate-600 transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
