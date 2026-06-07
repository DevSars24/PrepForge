"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import ThreeParticles from "@/components/ThreeParticles";
import Magnetic from "@/components/Magnetic";
import SplitText from "@/components/SplitText";
import {
  FileText,
  ScanLine,
  Brain,
  BarChart3,
  Shield,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  X,
  Play,
  ArrowUpRight,
  Quote,
  BookOpen,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, AnimatePresence, useInView } from "framer-motion";

// Register GSAP ScrollTrigger
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA SECTION DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

const featuresList = [
  {
    icon: <FileText size={22} className="text-purple-600" />,
    title: "Step-wise Descriptive Evaluation",
    desc: "AI reads handwritten pages and aligns scores directly to individual rubric steps. Provides precise grading citations.",
    badge: "DESCRIPTIVE",
    accent: "purple",
  },
  {
    icon: <ScanLine size={22} className="text-orange-500" />,
    title: "OMR Bubble Sheet Auditor",
    desc: "Upload bubbles files to process double shading, blank rows, and light grids automatically. Scored instantly against keys.",
    badge: "OMR AUDIT",
    accent: "orange",
  },
  {
    icon: <Brain size={22} className="text-purple-600" />,
    title: "Chain-of-Thought Rubric Logic",
    desc: "The AI reasons through sign conventions, formula check steps, and NCERT criteria to explain every awarded mark.",
    badge: "AI GRADER",
    accent: "purple",
  },
  {
    icon: <BarChart3 size={22} className="text-orange-500" />,
    title: "Syllabus Gap Mining",
    desc: "Aggregates missed questions to plot precise concept weakness charts. Generates targeted study plans automatically.",
    badge: "GAP ANALYSIS",
    accent: "orange",
  },
];

const stepsList = [
  {
    num: "01",
    title: "Secure Authentication",
    desc: "Sign in with your Clerk protected faculty credentials to access the secure evaluation workspace.",
  },
  {
    num: "02",
    title: "Configure Student Profile",
    desc: "Input name, roll number, batch, subject, and exam context in the dynamic modal configurator card.",
  },
  {
    num: "03",
    title: "Upload & Match Scans",
    desc: "Drop student answer sheets, OMR files, and custom marking rubrics into the drag-and-drop upload zone.",
  },
  {
    num: "04",
    title: "Generate AI Analytics",
    desc: "Get immediate citation-backed grades, concept gaps, custom recommendations, and exportable reports.",
  },
];

const testimonialsList = [
  {
    quote: "PrepForge reduced our weekly descriptive grading cycle from 3 days to just 20 minutes per batch.",
    author: "Dr. Ramesh Iyer",
    role: "Senior Physics Faculty, FIITJEE",
  },
  {
    quote: "The OMR anomaly detection correctly flagged 14 double-bubbled sheets that standard scanners missed.",
    author: "Prof. Anjali Sen",
    role: "HOD Chemistry, Allen Career Inst.",
  },
  {
    quote: "Every step score has a clear citation showing precisely which line of the student's sheet earned the mark.",
    author: "Maths Coordinator",
    role: "Sri Chaitanya Academy",
  },
  {
    quote: "The personalized gap study recommendations have boosted our student improvement margins by 18%.",
    author: "Director of Academics",
    role: "Narayana Group",
  },
];

const faqsList = [
  {
    q: "How does the AI verify handwritten math equations or formulas?",
    a: "Our pipeline uses multi-provider OCR (Mistral OCR + Gemini Vision) to transcribe handwriting. The grading engine then checks formulas, intermediate derivation lines, and numerical constants against your criteria.",
  },
  {
    q: "Can I upload custom rubrics for unit-level examinations?",
    a: "Absolutely. You can upload custom marking keys as PDFs or type/paste your grading guidelines. The AI adapts to your criteria dynamically.",
  },
  {
    q: "How secure is student data on the platform?",
    a: "All sheets, OCR outputs, and reports are protected. We use Clerk for authentication and Supabase PostgreSQL with Row Level Security to isolate data.",
  },
  {
    q: "Is there a limit on OMR sheets processed simultaneously?",
    a: "No. The system allows bulk uploads of scanned bubble sheets and grades them against the reference answer key in parallel.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT IMPLEMENTATIONS
// ─────────────────────────────────────────────────────────────────────────────

function RollingNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = value;
    const duration = 1.5; // Seconds
    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor((duration * 1000) / range));
    
    const timer = setInterval(() => {
      current += 1;
      setCount(current);
      if (current >= end) {
        clearInterval(timer);
      }
    }, Math.max(stepTime, 16));

    return () => clearInterval(timer);
  }, [value, isInView]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 py-5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left py-2 font-bold text-slate-800 hover:text-purple-600 transition-colors cursor-pointer"
      >
        <span className="text-base md:text-lg">{question}</span>
        <span className={`transform transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
          <ChevronDown size={20} className="text-slate-400" />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="text-sm md:text-base text-slate-500 py-3 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PricingCard({
  plan,
  price,
  features,
  accent = "purple",
  isPopular = false,
}: {
  plan: string;
  price: string;
  features: string[];
  accent?: "purple" | "orange";
  isPopular?: boolean;
}) {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const borderGradient =
    accent === "orange"
      ? "radial-gradient(220px circle at var(--x) var(--y), rgba(234, 88, 12, 0.4), transparent)"
      : "radial-gradient(220px circle at var(--x) var(--y), rgba(139, 92, 246, 0.4), transparent)";

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "relative",
        background: "#FFFFFF",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "32px",
        transition: "all 0.3s ease",
        transform: isPopular ? "scale(1.03)" : "scale(1)",
        boxShadow: isPopular ? "var(--shadow-lg)" : "var(--shadow-sm)",
      }}
      className={`flex flex-col h-full hover:shadow-md ${isPopular ? "border-purple-300 ring-2 ring-purple-100" : "hover:border-slate-300"}`}
    >
      {/* Dynamic spotlight border styling */}
      {isHovered && (
        <div
          style={{
            position: "absolute",
            inset: -1,
            borderRadius: "inherit",
            pointerEvents: "none",
            zIndex: 1,
            border: "1.5px solid transparent",
            background: borderGradient,
            WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            "--x": `${coords.x}px`,
            "--y": `${coords.y}px`,
          } as React.CSSProperties}
        />
      )}

      {isPopular && (
        <span className="absolute top-4 right-4 bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          MOST POPULAR
        </span>
      )}

      <div className="mb-6">
        <h4 className="text-lg font-bold text-slate-800 uppercase tracking-wider mb-2">{plan}</h4>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-extrabold text-slate-900">{price}</span>
          <span className="text-sm text-slate-500">/ month</span>
        </div>
      </div>

      <ul className="space-y-4 mb-8 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
            <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${accent === "orange" ? "text-orange-500" : "text-purple-600"}`} />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Magnetic>
        <Link
          href="/evaluate"
          className={`w-full text-center py-3 px-6 rounded-lg text-sm font-bold transition-colors block ${
            isPopular
              ? "bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
              : "bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200"
          }`}
        >
          Get Started
        </Link>
      </Magnetic>
    </div>
  );
}

export default function PremiumLanding() {
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // GSAP ScrollTrigger timeline animation
    if (timelineRef.current) {
      const line = timelineRef.current.querySelector(".active-line");
      const steps = timelineRef.current.querySelectorAll(".step-node");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: timelineRef.current,
          start: "top center",
          end: "bottom center",
          scrub: true,
        },
      });

      tl.fromTo(line, { scaleY: 0 }, { scaleY: 1, ease: "none" });

      steps.forEach((step) => {
        gsap.fromTo(
          step,
          { scale: 0.8, backgroundColor: "#E2E8F0" },
          {
            scale: 1.2,
            backgroundColor: "#8B5CF6", // Purple active step
            borderColor: "#FFFFFF",
            scrollTrigger: {
              trigger: step,
              start: "top center+=100",
              end: "bottom center",
              scrub: true,
            },
          }
        );
      });
    }
  }, []);

  return (
    <div className="bg-white text-slate-900 min-h-screen font-sans selection:bg-purple-100 selection:text-purple-900">
      <Navbar />

      {/* ───────────────────────────────────────────────────────────────────────
          1. HERO SECTION
          ─────────────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex flex-col justify-center items-center px-6 md:px-12 pt-24 pb-16 overflow-hidden border-b border-slate-100 bg-white">
        {/* Three.js particles background */}
        <ThreeParticles />

        <div className="max-w-4xl text-center z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-100 bg-purple-50/50 text-purple-700 text-xs font-semibold uppercase tracking-wider mb-8 shadow-sm">
            <Sparkles size={13} className="text-purple-600 animate-pulse" />
            AI-Driven Answer Sheet Grading
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.08] mb-6 max-w-3xl">
            <SplitText text="Next-Gen AI" className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-orange-500" />
            <br />
            <span className="text-slate-900">Evaluation Suite</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-500 max-w-2xl leading-relaxed mb-10">
            Automate descriptive answer grading and OMR verification with absolute precision.
            PrepForge checks step formulas, quotes evidence citations, and maps conceptual syllabus gaps.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Magnetic>
              <Link
                href="/evaluate"
                className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-base shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group cursor-pointer"
              >
                Open Faculty Console
                <ArrowRight size={18} className="transform group-hover:translate-x-1 transition-transform" />
              </Link>
            </Magnetic>

            <Magnetic>
              <Link
                href="#features"
                className="px-8 py-4 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-lg font-bold text-base shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                Learn More
              </Link>
            </Magnetic>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          2. FEATURES SECTION (Asymmetric Layout)
          ─────────────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto bg-white border-b border-slate-100" id="features">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-3">AI Capabilities</h2>
          <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Engineered for Precision Grading
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Card 1: Large Purple feature card */}
          <div className="md:col-span-7 border border-slate-100 bg-slate-50/50 p-8 md:p-10 rounded-2xl flex flex-col justify-between hover:border-purple-200 transition-all duration-300 shadow-sm">
            <div>
              <span className="inline-block bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-6">
                {featuresList[0].badge}
              </span>
              <h4 className="text-2xl font-bold text-slate-900 mb-4">{featuresList[0].title}</h4>
              <p className="text-slate-600 leading-relaxed max-w-xl">{featuresList[0].desc}</p>
            </div>
            <div className="mt-8 flex justify-between items-end">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                {featuresList[0].icon}
              </div>
              <Link href="/evaluate" className="text-sm font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1">
                Try console <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>

          {/* Card 2: Small Orange feature card */}
          <div className="md:col-span-5 border border-slate-100 p-8 rounded-2xl flex flex-col justify-between hover:border-orange-200 transition-all duration-300 shadow-sm bg-white">
            <div>
              <span className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-6">
                {featuresList[1].badge}
              </span>
              <h4 className="text-2xl font-bold text-slate-900 mb-4">{featuresList[1].title}</h4>
              <p className="text-slate-600 leading-relaxed">{featuresList[1].desc}</p>
            </div>
            <div className="mt-8 flex justify-between items-end">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                {featuresList[1].icon}
              </div>
              <Link href="/evaluate" className="text-sm font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1">
                Audit OMR <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>

          {/* Card 3: Small Purple feature card */}
          <div className="md:col-span-5 border border-slate-100 p-8 rounded-2xl flex flex-col justify-between hover:border-purple-200 transition-all duration-300 shadow-sm bg-white">
            <div>
              <span className="inline-block bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-6">
                {featuresList[2].badge}
              </span>
              <h4 className="text-2xl font-bold text-slate-900 mb-4">{featuresList[2].title}</h4>
              <p className="text-slate-600 leading-relaxed">{featuresList[2].desc}</p>
            </div>
            <div className="mt-8 flex justify-between items-end">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                {featuresList[2].icon}
              </div>
              <Link href="/evaluate" className="text-sm font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1">
                Grading Flow <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>

          {/* Card 4: Large Orange feature card */}
          <div className="md:col-span-7 border border-slate-100 bg-slate-50/50 p-8 md:p-10 rounded-2xl flex flex-col justify-between hover:border-orange-200 transition-all duration-300 shadow-sm">
            <div>
              <span className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-6">
                {featuresList[3].badge}
              </span>
              <h4 className="text-2xl font-bold text-slate-900 mb-4">{featuresList[3].title}</h4>
              <p className="text-slate-600 leading-relaxed max-w-xl">{featuresList[3].desc}</p>
            </div>
            <div className="mt-8 flex justify-between items-end">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                {featuresList[3].icon}
              </div>
              <Link href="/evaluate" className="text-sm font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1">
                View Gaps <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          3. PROBLEM / SOLUTION SECTION (Scroll storytelling)
          ─────────────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 md:px-12 bg-slate-50/50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-3">Before vs After</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Tearing Down Grading Friction
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
            {/* The Pain */}
            <div className="bg-white border border-slate-100 p-8 md:p-12 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-orange-500" />
              <div>
                <span className="text-orange-500 font-bold text-xs uppercase tracking-wider block mb-4">The Paper Pain</span>
                <h4 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6">Manual Stack Verification</h4>
                
                <ul className="space-y-6">
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-50 text-orange-600 text-xs font-bold flex items-center justify-center shrink-0 mt-1">✗</span>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Prone to inconsistencies</p>
                      <p className="text-xs text-slate-500 mt-1">Teachers grading late at night apply varying standards across paper batches.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-50 text-orange-600 text-xs font-bold flex items-center justify-center shrink-0 mt-1">✗</span>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">OMR bubble blindspots</p>
                      <p className="text-xs text-slate-500 mt-1">Faintly shaded bubbles or double shaded columns bypass standard scanner counts without warnings.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-50 text-orange-600 text-xs font-bold flex items-center justify-center shrink-0 mt-1">✗</span>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">No actionable gap maps</p>
                      <p className="text-xs text-slate-500 mt-1">Grades are reported as total digits. Students receive zero structural indicators on topic gaps.</p>
                    </div>
                  </li>
                </ul>
              </div>
              <p className="text-xs text-slate-400 mt-10">Average grading speed: 12-15 papers / hour.</p>
            </div>

            {/* The Cure */}
            <div className="bg-white border border-slate-200 p-8 md:p-12 rounded-2xl shadow-md flex flex-col justify-between relative overflow-hidden ring-2 ring-purple-100">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-purple-600" />
              <div>
                <span className="text-purple-600 font-bold text-xs uppercase tracking-wider block mb-4">The PrepForge Cure</span>
                <h4 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">AI Automated Grading Console</h4>
                
                <ul className="space-y-6">
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 text-xs font-bold flex items-center justify-center shrink-0 mt-1">✓</span>
                    <div>
                      <p className="font-semibold text-slate-950 text-sm">Strict Step-marks Alignment</p>
                      <p className="text-xs text-slate-500 mt-1">AI transcribes and evaluates line-by-line. Each mark is bound to source citations and expectations.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 text-xs font-bold flex items-center justify-center shrink-0 mt-1">✓</span>
                    <div>
                      <p className="font-semibold text-slate-950 text-sm">Audit alerts for bubble anomalies</p>
                      <p className="text-xs text-slate-500 mt-1">Vision checks detect faint markings and multiple answers, flagging them for human verification.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 text-xs font-bold flex items-center justify-center shrink-0 mt-1">✓</span>
                    <div>
                      <p className="font-semibold text-slate-950 text-sm">Auto recommendations and gap mines</p>
                      <p className="text-xs text-slate-500 mt-1">Identifies syllabus weakness and lists precise NCERT homework pointers for each student.</p>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="mt-10 flex items-center justify-between">
                <p className="text-xs text-slate-400">Average grading speed: 180 papers / minute.</p>
                <Link href="/evaluate" className="text-xs font-bold text-purple-600 hover:text-purple-750 flex items-center gap-1">
                  Try AI Grading <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          4. HOW IT WORKS SECTION (GSAP Vertical Growing Line)
          ─────────────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 md:px-12 bg-white border-b border-slate-100" id="workflow">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-3">Workflow</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Four Steps to Dynamic Insights
            </h3>
          </div>

          <div ref={timelineRef} className="relative max-w-3xl mx-auto">
            {/* Center static timeline track */}
            <div className="absolute left-[20px] md:left-1/2 -translate-x-1/2 top-4 bottom-4 w-[2px] bg-slate-100 z-0" />
            
            {/* Center growing active line on scroll */}
            <div className="active-line absolute left-[20px] md:left-1/2 -translate-x-1/2 top-4 bottom-4 w-[2px] bg-purple-600 z-0 origin-top" />

            <div className="space-y-16">
              {stepsList.map((step, index) => {
                const isEven = index % 2 === 0;
                return (
                  <div key={index} className={`relative flex flex-col md:flex-row items-start z-10 ${isEven ? "" : "md:flex-row-reverse"}`}>
                    
                    {/* Node marker point */}
                    <div className="step-node absolute left-[20px] md:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-slate-200 bg-white z-20 top-1.5 transition-all duration-300" />

                    {/* Timeline card side content */}
                    <div className={`pl-10 md:pl-0 w-full md:w-1/2 ${isEven ? "md:pr-16 text-left" : "md:pl-16 text-left"}`}>
                      <div className="bg-white border border-slate-100 p-6 rounded-xl hover:border-slate-200 transition-all shadow-sm">
                        <span className="text-xs font-extrabold text-orange-500 tracking-widest uppercase block mb-1">
                          Step {step.num}
                        </span>
                        <h4 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h4>
                        <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                    
                    {/* Empty block for horizontal balance on desktop */}
                    <div className="hidden md:block w-1/2" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          5. STATISTICS SECTION
          ─────────────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 md:px-12 bg-slate-50/50 border-b border-slate-100 text-center">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="p-6">
              <p className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-2 tracking-tight">
                <RollingNumber value={99} suffix="." />
                <RollingNumber value={2} suffix="%" />
              </p>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Grading Accuracy</p>
              <p className="text-xs text-slate-400 mt-2">Verified across NCERT evaluation standards.</p>
            </div>
            <div className="p-6 border-y sm:border-y-0 sm:border-x border-slate-200">
              <p className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-2 tracking-tight">
                <RollingNumber value={15} suffix="," />
                <RollingNumber value={200} suffix="+" />
              </p>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Sheets Checked</p>
              <p className="text-xs text-slate-400 mt-2">Active grading sheets processed by faculty portals.</p>
            </div>
            <div className="p-6">
              <p className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-2 tracking-tight">
                <RollingNumber value={420} suffix="h" />
              </p>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Faculty Hours Saved</p>
              <p className="text-xs text-slate-400 mt-2">Hours redirected back to student tutoring.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          6. TESTIMONIALS SECTION (Dual Marquee Loops)
          ─────────────────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white border-b border-slate-100 overflow-hidden">
        <div className="text-center max-w-2xl mx-auto mb-16 px-6">
          <h2 className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-3">Testimonials</h2>
          <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Loved by Core Faculty Groups
          </h3>
        </div>

        <div className="space-y-6">
          {/* Row 1: Forward Marquee */}
          <div className="marquee-container">
            <div className="marquee-track">
              {[...testimonialsList, ...testimonialsList].map((t, i) => (
                <div
                  key={i}
                  className="w-[320px] md:w-[380px] shrink-0 border border-slate-150 p-6 rounded-xl bg-white shadow-sm flex flex-col justify-between"
                >
                  <Quote size={24} className="text-purple-100 mb-4" />
                  <p className="text-slate-700 text-sm leading-relaxed mb-6 font-medium italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div>
                    <h5 className="font-bold text-slate-800 text-sm">{t.author}</h5>
                    <p className="text-xs text-slate-400 mt-0.5">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 2: Reverse Marquee */}
          <div className="marquee-container">
            <div className="marquee-track-reverse">
              {[...testimonialsList, ...testimonialsList].map((t, i) => (
                <div
                  key={i}
                  className="w-[320px] md:w-[380px] shrink-0 border border-slate-150 p-6 rounded-xl bg-white shadow-sm flex flex-col justify-between"
                >
                  <Quote size={24} className="text-orange-100 mb-4" />
                  <p className="text-slate-700 text-sm leading-relaxed mb-6 font-medium italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div>
                    <h5 className="font-bold text-slate-800 text-sm">{t.author}</h5>
                    <p className="text-xs text-slate-400 mt-0.5">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          7. PRICING SECTION
          ─────────────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto bg-white border-b border-slate-100">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-3">Pricing Plans</h2>
          <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Transparent Pricing for Institutions
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch pt-6">
          {/* Plan 1 */}
          <div className="flex flex-col">
            <PricingCard
              plan="Starter Portal"
              price="$79"
              accent="orange"
              features={[
                "Process up to 100 descriptive papers/mo",
                "Basic handwriting OCR mapping",
                "Standard OMR checking (up to 50 sheets/mo)",
                "Basic gap analysis dashboard",
                "Online email support",
              ]}
            />
          </div>

          {/* Plan 2: Elevated Pro */}
          <div className="flex flex-col md:-translate-y-4">
            <PricingCard
              plan="Pro Faculty"
              price="$189"
              isPopular={true}
              accent="purple"
              features={[
                "Unlimited descriptive answer sheets",
                "Chain-of-Thought AI detailed logic check",
                "Unlimited OMR checking + double-bubble audit",
                "Advanced cohort gap analytics dashboard",
                "HTML/PDF report exports",
                "Priority chat and ticket support",
              ]}
            />
          </div>

          {/* Plan 3 */}
          <div className="flex flex-col">
            <PricingCard
              plan="Enterprise System"
              price="$449"
              accent="orange"
              features={[
                "Institutional API access layer",
                "Multiple department profiles under unified billing",
                "SLA uptime guarantees",
                "Dedicated training sessions for professors",
                "Custom integrations with existing LMS systems",
                "Dedicated account executive",
              ]}
            />
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          8. FAQ SECTION (Minimal Accordion)
          ─────────────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 md:px-12 max-w-4xl mx-auto bg-white border-b border-slate-100">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-3">FAQ</h2>
          <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h3>
        </div>

        <div className="space-y-2">
          {faqsList.map((faq, index) => (
            <AccordionItem key={index} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────────
          9. FOOTER SECTION
          ─────────────────────────────────────────────────────────────────────── */}
      <footer className="py-16 px-6 md:px-12 bg-white max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-slate-100 pb-12 mb-8">
          <div>
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-slate-900 mb-3">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-orange-500 flex items-center justify-center text-white">
                <BookOpen size={16} strokeWidth={2.5} />
              </span>
              Prep<span className="text-purple-600">Forge</span>
            </Link>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
              Automated high-precision paper verification suite built specifically for JEE &amp; NEET prep institutes.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-12 gap-y-6">
            <div>
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4">Product</h5>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/evaluate" className="text-slate-500 hover:text-purple-600 transition-colors">
                    Faculty Console
                  </Link>
                </li>
                <li>
                  <Link href="#features" className="text-slate-500 hover:text-purple-600 transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#workflow" className="text-slate-500 hover:text-purple-600 transition-colors">
                    How it works
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4">Company</h5>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="text-slate-500 hover:text-purple-600 transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="mailto:support@prepforge.com" className="text-slate-500 hover:text-purple-600 transition-colors">
                    Support Desk
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} PrepForge — All Rights Reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-slate-600">Terms of Use</Link>
            <Link href="/privacy" className="hover:text-slate-600">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
