"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
import { TextPlugin } from "gsap/TextPlugin";
import { AnimatePresence, motion } from "framer-motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, TextPlugin);
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA
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
    quote:
      "PrepForge reduced our weekly descriptive grading cycle from three days of manual work to under twenty minutes. The step-wise citation system makes it easy for us to verify every single marked answer.",
    author: "Dr. Ramesh Iyer",
    role: "Senior Physics Faculty, FIITJEE",
  },
  {
    quote:
      "Our institute processed thousands of OMR bubble sheets last month. The anomaly detection is incredibly accurate, automatically highlighting faint shading errors that standard scanners completely missed.",
    author: "Prof. Anjali Sen",
    role: "HOD Chemistry, Allen Career Institute",
  },
  {
    quote:
      "Finally, an AI grading system that doesn't just output a single arbitrary number. PrepForge provides clear, NCERT-aligned explanations for every deduction, which helps our students target exactly what to revise.",
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

// ─────────────────────────────────────────────────────────────────────────────
// ACCORDION
// ─────────────────────────────────────────────────────────────────────────────

function AccordionItem({
  question,
  answer,
  index,
}: {
  question: string;
  answer: string;
  index: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!itemRef.current) return;
    gsap.fromTo(
      itemRef.current,
      { opacity: 0, x: -16 },
      {
        opacity: 1,
        x: 0,
        duration: 0.55,
        ease: "power2.out",
        delay: index * 0.08,
        scrollTrigger: {
          trigger: itemRef.current,
          start: "top bottom-=60",
          toggleActions: "play none none none",
        },
      }
    );
  }, [index]);

  return (
    <div ref={itemRef} className="border-b border-slate-100 py-6 last:border-0">
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
            transition={{ duration: 0.25, ease: "easeInOut" }}
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

// ─────────────────────────────────────────────────────────────────────────────
// COUNT-UP HOOK
// ─────────────────────────────────────────────────────────────────────────────

function useCountUp(
  target: number,
  duration = 1.8,
  suffix = "",
  prefix = "",
  decimals = 0
) {
  const ref = useRef<HTMLParagraphElement>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top bottom-=60",
      onEnter: () => {
        if (hasRun.current) return;
        hasRun.current = true;
        const obj = { val: 0 };
        gsap.to(obj, {
          val: target,
          duration,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent =
              prefix +
              obj.val.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
              suffix;
          },
        });
      },
    });
    return () => trigger.kill();
  }, [target, duration, suffix, prefix, decimals]);

  return ref;
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT ITEM
// ─────────────────────────────────────────────────────────────────────────────

function StatItem({
  target,
  suffix,
  prefix,
  decimals,
  label,
  sub,
  bordered,
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  label: string;
  sub: string;
  bordered?: boolean;
}) {
  const numRef = useCountUp(target, 1.8, suffix ?? "", prefix ?? "", decimals ?? 0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wrapRef.current) return;
    gsap.fromTo(
      wrapRef.current,
      { opacity: 0, y: 28 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
        scrollTrigger: {
          trigger: wrapRef.current,
          start: "top bottom-=60",
          toggleActions: "play none none none",
        },
      }
    );
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`p-6 text-center ${
        bordered
          ? "border-y md:border-y-0 md:border-x border-slate-200"
          : ""
      }`}
    >
      <p
        ref={numRef}
        className="text-5xl md:text-6xl font-black text-[#0F172A] mb-2 tracking-tight tabular-nums"
      >
        0
      </p>
      <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </h4>
      <p className="text-xs text-slate-400 max-w-[200px] mx-auto">{sub}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function CleanPremiumLanding() {
  const heroRef = useRef<HTMLElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const featuresGridRef = useRef<HTMLDivElement>(null);
  const beforeAfterRef = useRef<HTMLDivElement>(null);
  const stepsGridRef = useRef<HTMLDivElement>(null);
  const testimonialsGridRef = useRef<HTMLDivElement>(null);
  const pricingGridRef = useRef<HTMLDivElement>(null);

  // ── Hero entrance animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // Badge pop-in
      tl.fromTo(
        badgeRef.current,
        { opacity: 0, y: -12, scale: 0.92 },
        { opacity: 1, y: 0, scale: 1, duration: 0.55 }
      );

      // H1 word-by-word split
      if (h1Ref.current) {
        const words = h1Ref.current.querySelectorAll(".hero-word");
        tl.fromTo(
          words,
          { opacity: 0, y: 20, rotateX: -18 },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            duration: 0.55,
            stagger: 0.055,
            ease: "power2.out",
          },
          "-=0.2"
        );
      }

      // Subtext slide
      tl.fromTo(
        subRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.55 },
        "-=0.25"
      );

      // CTA buttons
      tl.fromTo(
        ctaRef.current,
        { opacity: 0, y: 14, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5 },
        "-=0.2"
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  // ── Features cards stagger
  useEffect(() => {
    if (!featuresGridRef.current) return;
    const cards = featuresGridRef.current.querySelectorAll(".feat-card");
    gsap.fromTo(
      cards,
      { opacity: 0, y: 40, scale: 0.97 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.65,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: featuresGridRef.current,
          start: "top bottom-=80",
          toggleActions: "play none none none",
        },
      }
    );
  }, []);

  // ── Before/After cards
  useEffect(() => {
    if (!beforeAfterRef.current) return;
    const cards = beforeAfterRef.current.querySelectorAll(".ba-card");
    gsap.fromTo(
      cards,
      { opacity: 0, x: (i) => (i === 0 ? -36 : 36) },
      {
        opacity: 1,
        x: 0,
        duration: 0.7,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: beforeAfterRef.current,
          start: "top bottom-=80",
          toggleActions: "play none none none",
        },
      }
    );
  }, []);

  // ── Steps cards
  useEffect(() => {
    if (!stepsGridRef.current) return;
    const cards = stepsGridRef.current.querySelectorAll(".step-card");
    gsap.fromTo(
      cards,
      { opacity: 0, y: 32 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: stepsGridRef.current,
          start: "top bottom-=60",
          toggleActions: "play none none none",
        },
      }
    );
  }, []);

  // ── Testimonials stagger
  useEffect(() => {
    if (!testimonialsGridRef.current) return;
    const cards =
      testimonialsGridRef.current.querySelectorAll(".testi-card");
    gsap.fromTo(
      cards,
      { opacity: 0, y: 36, scale: 0.96 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.65,
        stagger: 0.13,
        ease: "power3.out",
        scrollTrigger: {
          trigger: testimonialsGridRef.current,
          start: "top bottom-=60",
          toggleActions: "play none none none",
        },
      }
    );
  }, []);

  // ── Pricing cards stagger
  useEffect(() => {
    if (!pricingGridRef.current) return;
    const cards = pricingGridRef.current.querySelectorAll(".price-card");
    gsap.fromTo(
      cards,
      { opacity: 0, y: 44, scale: 0.95 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.7,
        stagger: 0.11,
        ease: "power3.out",
        scrollTrigger: {
          trigger: pricingGridRef.current,
          start: "top bottom-=60",
          toggleActions: "play none none none",
        },
      }
    );
  }, []);

  // ── Section headings reveal
  useEffect(() => {
    const headings = document.querySelectorAll(".section-heading");
    headings.forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 22 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top bottom-=60",
            toggleActions: "play none none none",
          },
        }
      );
    });

    // Subtle parallax on bg-slate sections
    const parallaxSections = document.querySelectorAll(".parallax-bg");
    parallaxSections.forEach((el) => {
      gsap.to(el, {
        backgroundPositionY: "30%",
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    });
  }, []);

  // Hero headline words
  const heroWords =
    "AI-powered answer sheet grading and OMR evaluation for educators.".split(
      " "
    );

  return (
    <div className="bg-white text-slate-900 min-h-screen font-sans selection:bg-[#7C3AED]/10 selection:text-[#7C3AED] overflow-x-hidden">
      <Navbar />

      {/* ─────────────────────────────────────────────────────────────────────
          1. HERO
          ───────────────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        style={{
          paddingTop: "144px",
          paddingBottom: "96px",
          paddingLeft: "24px",
          paddingRight: "24px",
        }}
        className="relative bg-white flex flex-col items-center text-center overflow-hidden w-full"
      >
        {/* Ambient glow blobs */}
        <div
          className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(124,58,237,0.05) 0%, transparent 70%)",
          }}
        />

        <div className="max-w-4xl z-10 flex flex-col items-center w-full">
          {/* Badge */}
          <div
            ref={badgeRef}
            style={{ opacity: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-100 bg-slate-50 text-[#7C3AED] text-xs font-semibold uppercase tracking-wider mb-6 shadow-sm"
          >
            <Sparkles size={13} className="text-[#7C3AED]" />
            AI Evaluation Console
          </div>

          {/* Word-by-word H1 */}
          <h1
            ref={h1Ref}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#0F172A] leading-[1.2] mb-6 max-w-3xl w-full"
            style={{ perspective: "600px" }}
          >
            {heroWords.map((word, i) => (
              <span
                key={i}
                className="hero-word inline-block mr-[0.25em] last:mr-0"
                style={{ opacity: 0, display: "inline-block" }}
              >
                {word}
              </span>
            ))}
          </h1>

          {/* Subtext */}
          <p
            ref={subRef}
            style={{ opacity: 0 }}
            className="text-lg md:text-xl text-slate-600 max-w-2xl leading-relaxed mb-10 w-full"
          >
            Streamline step-by-step descriptive exam marking and bubble-sheet
            verification. Grade handwriting with citation audits, map conceptual
            syllabus gaps, and reclaim valuable prep hours.
          </p>

          {/* CTA Buttons */}
          <div
            ref={ctaRef}
            style={{ opacity: 0 }}
            className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full"
          >
            <Link
              href="/evaluate"
              className="group relative px-8 py-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl font-bold text-base shadow-[0_4px_14px_rgba(124,58,237,0.28)] hover:shadow-[0_8px_28px_rgba(124,58,237,0.4)] transition-all flex items-center gap-2 overflow-hidden cursor-pointer"
              style={{ transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)" }}
            >
              <span className="relative z-10">Open Faculty Console</span>
              <ArrowRight
                size={18}
                className="relative z-10 transform group-hover:translate-x-1 transition-transform duration-200"
              />
              {/* shimmer */}
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-in-out bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            </Link>
            <Link
              href="#features"
              className="px-8 py-4 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-xl font-bold text-base shadow-sm transition-all cursor-pointer hover:-translate-y-0.5"
              style={{ transition: "all 0.2s ease" }}
            >
              Explore Features
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          2. FEATURES
          ───────────────────────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: "96px",
          paddingBottom: "96px",
          paddingLeft: "24px",
          paddingRight: "24px",
        }}
        className="max-w-7xl mx-auto border-t border-slate-100 bg-white w-full"
        id="features"
      >
        <div className="section-heading text-center max-w-2xl mx-auto mb-16 w-full" style={{ opacity: 0 }}>
          <h2 className="text-xs font-bold text-[#7C3AED] uppercase tracking-widest mb-3">
            Capabilities
          </h2>
          <h3 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] tracking-tight">
            High-Precision Grading Features
          </h3>
          <p className="text-slate-600 mt-2">
            Automate routine validation tasks while maintaining full grading
            accuracy and transparency.
          </p>
        </div>

        <div
          ref={featuresGridRef}
          className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full"
        >
          {featuresList.map((feat, idx) => (
            <div
              key={idx}
              className="feat-card group border border-slate-200/80 rounded-xl p-5 flex flex-col justify-between bg-white shadow-[0_2px_12px_rgba(15,23,42,0.02)] cursor-pointer"
              style={{
                opacity: 0,
                transition:
                  "border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s cubic-bezier(0.16,1,0.3,1)",
              }}
              onMouseEnter={(e) => {
                gsap.to(e.currentTarget, {
                  y: -4,
                  boxShadow:
                    feat.accent === "orange"
                      ? "0 12px 28px rgba(249,115,22,0.1)"
                      : "0 12px 28px rgba(124,58,237,0.1)",
                  duration: 0.3,
                  ease: "power2.out",
                });
              }}
              onMouseLeave={(e) => {
                gsap.to(e.currentTarget, {
                  y: 0,
                  boxShadow: "0 2px 12px rgba(15,23,42,0.02)",
                  duration: 0.35,
                  ease: "power2.out",
                });
              }}
            >
              <div>
                <div className="mb-3">
                  <span
                    className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      feat.accent === "orange"
                        ? "bg-orange-50 text-[#F97316]"
                        : "bg-purple-50 text-[#7C3AED]"
                    }`}
                  >
                    {feat.badge}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-[#0F172A] mb-2">
                  {feat.title}
                </h4>
                <p className="text-slate-600 text-xs leading-relaxed">
                  {feat.desc}
                </p>
              </div>
              <div className="mt-5 flex justify-between items-center pt-4 border-t border-slate-100 w-full">
                <div className="p-2 rounded-lg bg-slate-50 group-hover:scale-110 transition-transform duration-300">
                  {feat.icon}
                </div>
                <Link
                  href="/evaluate"
                  className={`text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                    feat.accent === "orange"
                      ? "text-[#F97316] hover:text-[#EA580C]"
                      : "text-[#7C3AED] hover:text-[#6D28D9]"
                  }`}
                >
                  Try Now{" "}
                  <ArrowRight
                    size={12}
                    className="group-hover:translate-x-1 transition-transform duration-200"
                  />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          3. BEFORE / AFTER
          ───────────────────────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: "96px",
          paddingBottom: "96px",
          paddingLeft: "24px",
          paddingRight: "24px",
        }}
        className="bg-slate-50/60 border-t border-b border-slate-100 w-full"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div
            className="section-heading text-center max-w-2xl mx-auto mb-16 w-full"
            style={{ opacity: 0 }}
          >
            <h2 className="text-xs font-bold text-[#F97316] uppercase tracking-widest mb-3">
              Contrast
            </h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              A Smarter Grading Workflow
            </h3>
          </div>

          <div
            ref={beforeAfterRef}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full"
          >
            {/* Pain */}
            <div
              className="ba-card bg-white border border-slate-200/80 p-6 rounded-xl flex flex-col justify-between relative overflow-hidden shadow-[0_2px_12px_rgba(15,23,42,0.02)]"
              style={{ opacity: 0 }}
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#F97316]" />
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-[#F97316] mb-4">
                  Manual Grading Process
                </div>
                <h4 className="text-xl font-bold text-[#0F172A] mb-4">
                  Stack &amp; Pen Verification
                </h4>
                <ul className="space-y-4">
                  {[
                    {
                      title: "Inconsistent step marking",
                      desc: "Applying grading rules uniformly over hours of late-night grading is prone to fatigue errors.",
                    },
                    {
                      title: "OMR audit oversights",
                      desc: "Faint bubbles, erase marks, and multiple selections trigger zero warnings and get miscounted by baseline scanners.",
                    },
                    {
                      title: "Missing concept analysis",
                      desc: "Students only see raw numeric scores. Teachers get no structured reports on syllabus topics requiring attention.",
                    },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-orange-50 text-[#F97316] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        ✗
                      </span>
                      <div>
                        <p className="font-semibold text-[#0F172A] text-sm">
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-slate-400 mt-6 border-t border-slate-100 pt-3">
                Manual speed average: 12-15 answer sheets per hour.
              </p>
            </div>

            {/* Solution */}
            <div
              className="ba-card bg-white border border-slate-300 p-6 rounded-xl flex flex-col justify-between relative overflow-hidden shadow-[0_2px_16px_rgba(15,23,42,0.03)] ring-1 ring-[#7C3AED]/10"
              style={{ opacity: 0 }}
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#7C3AED]" />
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-[#7C3AED] mb-4">
                  PrepForge Console
                </div>
                <h4 className="text-xl font-bold text-[#0F172A] mb-4">
                  AI-Powered Evaluation Suite
                </h4>
                <ul className="space-y-4">
                  {[
                    {
                      title: "Step-wise evidence matching",
                      desc: "Every mark awarded is linked to specific lines on the student's sheet and mapped directly to your custom rubric guidelines.",
                    },
                    {
                      title: "Visual bubble audits",
                      desc: "AI models detect faint shading patterns and double-bubbled selections, flagging them for rapid faculty confirmation.",
                    },
                    {
                      title: "Instant concept gap tracking",
                      desc: "Generates real-time, topic-wise analysis dashboards charting cohorts' structural gaps with NCERT revision tips.",
                    },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-purple-50 text-[#7C3AED] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        ✓
                      </span>
                      <div>
                        <p className="font-semibold text-[#0F172A] text-sm">
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between w-full">
                <p className="text-xs text-slate-400">
                  Processing speed average: 180 documents per minute.
                </p>
                <Link
                  href="/evaluate"
                  className="text-xs font-bold text-[#7C3AED] hover:text-[#6D28D9] flex items-center gap-1 cursor-pointer group"
                >
                  Launch Console{" "}
                  <ArrowRight
                    size={12}
                    className="ml-0.5 group-hover:translate-x-1 transition-transform duration-200"
                  />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          4. HOW IT WORKS
          ───────────────────────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: "96px",
          paddingBottom: "96px",
          paddingLeft: "24px",
          paddingRight: "24px",
        }}
        className="bg-white w-full"
        id="workflow"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div
            className="section-heading text-center max-w-2xl mx-auto mb-16 w-full"
            style={{ opacity: 0 }}
          >
            <h2 className="text-xs font-bold text-[#7C3AED] uppercase tracking-widest mb-3">
              Workflow
            </h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              Minimalist 4-Step Process
            </h3>
          </div>

          <div
            ref={stepsGridRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full"
          >
            {stepsList.map((step, idx) => (
              <div
                key={idx}
                className="step-card group bg-white border border-slate-200 p-8 rounded-2xl flex flex-col justify-between"
                style={{
                  opacity: 0,
                  transition: "border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease",
                }}
                onMouseEnter={(e) => {
                  gsap.to(e.currentTarget, {
                    y: -4,
                    boxShadow: "0 12px 32px rgba(124,58,237,0.08)",
                    duration: 0.28,
                    ease: "power2.out",
                  });
                }}
                onMouseLeave={(e) => {
                  gsap.to(e.currentTarget, {
                    y: 0,
                    boxShadow: "none",
                    duration: 0.3,
                    ease: "power2.out",
                  });
                }}
              >
                <div>
                  <span className="text-5xl font-black text-slate-100 tracking-tight block mb-4 group-hover:text-[#7C3AED]/10 transition-colors duration-300">
                    {step.num}
                  </span>
                  <h4 className="text-lg font-bold text-[#0F172A] mb-2">
                    {step.title}
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          5. STATISTICS — count-up
          ───────────────────────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: "80px",
          paddingBottom: "80px",
          paddingLeft: "24px",
          paddingRight: "24px",
        }}
        className="bg-slate-50/60 border-t border-b border-slate-100 w-full"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center w-full">
            <StatItem
              target={99.2}
              suffix="%"
              decimals={1}
              label="Grading Accuracy"
              sub="Verified against rigorous standard test keys."
            />
            <StatItem
              target={150000}
              suffix="+"
              label="Sheets Checked"
              sub="Active papers processed by faculty platforms."
              bordered
            />
            <StatItem
              target={85}
              suffix="%"
              label="Time Saved"
              sub="Valuable prep hours redirected back to students."
            />
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          6. TESTIMONIALS
          ───────────────────────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: "96px",
          paddingBottom: "96px",
          paddingLeft: "24px",
          paddingRight: "24px",
        }}
        className="bg-white w-full"
        id="testimonials"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div
            className="section-heading text-center max-w-2xl mx-auto mb-16 w-full"
            style={{ opacity: 0 }}
          >
            <h2 className="text-xs font-bold text-[#7C3AED] uppercase tracking-widest mb-3">
              Feedback
            </h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              Trusted by Faculty
            </h3>
          </div>

          <div
            ref={testimonialsGridRef}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full"
          >
            {testimonialsList.map((t, i) => (
              <div
                key={i}
                className="testi-card group border border-slate-200/80 p-8 md:p-10 rounded-2xl bg-white shadow-[0_4px_25px_-5px_rgba(15,23,42,0.03)] flex flex-col justify-between cursor-default"
                style={{
                  opacity: 0,
                  transition: "border-color 0.25s ease, box-shadow 0.25s ease, transform 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  gsap.to(e.currentTarget, {
                    y: -5,
                    boxShadow: "0 16px 40px rgba(124,58,237,0.08)",
                    duration: 0.3,
                    ease: "power2.out",
                  });
                }}
                onMouseLeave={(e) => {
                  gsap.to(e.currentTarget, {
                    y: 0,
                    boxShadow: "0 4px 25px -5px rgba(15,23,42,0.03)",
                    duration: 0.35,
                    ease: "power2.out",
                  });
                }}
              >
                <div>
                  <Quote
                    size={28}
                    className="text-[#7C3AED]/10 mb-6 group-hover:text-[#7C3AED]/20 transition-colors duration-300"
                  />
                  <p className="text-slate-600 text-sm md:text-base leading-relaxed italic mb-8 whitespace-normal">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>
                <div className="pt-6 border-t border-slate-100 w-full mt-4">
                  <h5 className="font-bold text-[#0F172A] text-sm md:text-base">
                    {t.author}
                  </h5>
                  <p className="text-xs text-slate-400 mt-1">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          7. PRICING — enlarged cards
          ───────────────────────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: "112px",
          paddingBottom: "112px",
          paddingLeft: "24px",
          paddingRight: "24px",
        }}
        className="bg-slate-50/60 border-t border-b border-slate-100 w-full"
        id="pricing"
      >
        <div className="max-w-7xl mx-auto w-full">
          <div
            className="section-heading text-center max-w-2xl mx-auto mb-20 w-full"
            style={{ opacity: 0 }}
          >
            <h2 className="text-xs font-bold text-[#7C3AED] uppercase tracking-widest mb-4">
              Pricing
            </h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] tracking-tight mb-4">
              Transparent Institutional Plans
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Honest, predictable tiers scaling from individual classrooms up to
              full-scale engineering campuses.
            </p>
          </div>

          {/* Compact pricing grid — small cards */}
          <div
            ref={pricingGridRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto w-full items-stretch"
          >
            {/* Free Sandbox */}
            <div
              className="price-card group bg-white border border-slate-200/60 rounded-xl p-5 flex flex-col justify-between shadow-[0_2px_20px_-3px_rgba(15,23,42,0.03)] cursor-pointer"
              style={{
                opacity: 0,
                transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
              }}
              onMouseEnter={(e) => {
                gsap.to(e.currentTarget, {
                  y: -5,
                  boxShadow: "0 16px 36px rgba(15,23,42,0.06)",
                  duration: 0.3,
                  ease: "power2.out",
                });
              }}
              onMouseLeave={(e) => {
                gsap.to(e.currentTarget, {
                  y: 0,
                  boxShadow: "0 2px 20px -3px rgba(15,23,42,0.03)",
                  duration: 0.35,
                  ease: "power2.out",
                });
              }}
            >
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Free Sandbox
                </h4>
                <div className="flex items-baseline gap-0.5 mb-4">
                  <span className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
                    $0
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    / month
                  </span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {[
                    "10 descriptive sheets check/mo",
                    "Standard OMR sheets (5/mo)",
                    "Basic NCERT evidence grading",
                    "7-day evaluation history",
                  ].map((feat, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                      <CheckCircle2 size={14} className="text-slate-300 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/evaluate"
                className="w-full text-center py-2.5 px-4 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 transition-all block cursor-pointer shadow-sm group-hover:shadow-md"
              >
                Start Sandbox
              </Link>
            </div>

            {/* Starter */}
            <div
              className="price-card group bg-white border border-slate-200/60 rounded-xl p-5 flex flex-col justify-between shadow-[0_2px_20px_-3px_rgba(15,23,42,0.03)] cursor-pointer"
              style={{
                opacity: 0,
                transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
              }}
              onMouseEnter={(e) => {
                gsap.to(e.currentTarget, {
                  y: -5,
                  boxShadow: "0 16px 36px rgba(249,115,22,0.08)",
                  duration: 0.3,
                  ease: "power2.out",
                });
              }}
              onMouseLeave={(e) => {
                gsap.to(e.currentTarget, {
                  y: 0,
                  boxShadow: "0 2px 20px -3px rgba(15,23,42,0.03)",
                  duration: 0.35,
                  ease: "power2.out",
                });
              }}
            >
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Starter Portal
                </h4>
                <div className="flex items-baseline gap-0.5 mb-4">
                  <span className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
                    $79
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    / month
                  </span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {[
                    "Process up to 100 papers/mo",
                    "Basic handwriting OCR mapping",
                    "Standard OMR checking (50 sheets/mo)",
                    "Basic gap analysis dashboard",
                  ].map((feat, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                      <CheckCircle2 size={14} className="text-[#F97316] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/evaluate"
                className="w-full text-center py-2.5 px-4 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 hover:border-orange-200 transition-all block cursor-pointer shadow-sm group-hover:shadow-md"
              >
                Get Started
              </Link>
            </div>

            {/* Pro (featured) */}
            <div
              className="price-card group bg-white border-2 border-[#7C3AED] rounded-xl p-5 flex flex-col justify-between shadow-[0_8px_32px_rgba(124,58,237,0.08)] relative cursor-pointer"
              style={{
                opacity: 0,
                transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
              }}
              onMouseEnter={(e) => {
                gsap.to(e.currentTarget, {
                  y: -5,
                  boxShadow: "0 20px 44px rgba(124,58,237,0.18)",
                  duration: 0.3,
                  ease: "power2.out",
                });
              }}
              onMouseLeave={(e) => {
                gsap.to(e.currentTarget, {
                  y: 0,
                  boxShadow: "0 8px 32px rgba(124,58,237,0.08)",
                  duration: 0.35,
                  ease: "power2.out",
                });
              }}
            >
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#7C3AED] text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider z-20 shadow-sm">
                MOST POPULAR
              </span>
              <div>
                <h4 className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-widest mb-3">
                  Pro Faculty
                </h4>
                <div className="flex items-baseline gap-0.5 mb-4">
                  <span className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
                    $189
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    / month
                  </span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {[
                    "Unlimited descriptive answer sheets",
                    "Chain-of-Thought AI grading logic",
                    "Unlimited OMR + anomaly auditing",
                    "Advanced cohort gap analytics",
                    "HTML/PDF evaluation reports export",
                  ].map((feat, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                      <CheckCircle2 size={14} className="text-[#7C3AED] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/evaluate"
                className="group/btn relative w-full text-center py-2.5 px-4 rounded-lg text-xs font-bold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-all block cursor-pointer shadow-[0_4px_14px_rgba(124,58,237,0.25)] hover:shadow-[0_8px_20px_rgba(124,58,237,0.38)] overflow-hidden"
              >
                <span className="relative z-10">Start Free Trial</span>
                <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-500 ease-in-out bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              </Link>
            </div>

            {/* Enterprise */}
            <div
              className="price-card group bg-white border border-slate-200/60 rounded-xl p-5 flex flex-col justify-between shadow-[0_2px_20px_-3px_rgba(15,23,42,0.03)] cursor-pointer"
              style={{
                opacity: 0,
                transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
              }}
              onMouseEnter={(e) => {
                gsap.to(e.currentTarget, {
                  y: -5,
                  boxShadow: "0 16px 36px rgba(249,115,22,0.07)",
                  duration: 0.3,
                  ease: "power2.out",
                });
              }}
              onMouseLeave={(e) => {
                gsap.to(e.currentTarget, {
                  y: 0,
                  boxShadow: "0 2px 20px -3px rgba(15,23,42,0.03)",
                  duration: 0.35,
                  ease: "power2.out",
                });
              }}
            >
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Enterprise System
                </h4>
                <div className="flex items-baseline gap-0.5 mb-4">
                  <span className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
                    $449
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    / month
                  </span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {[
                    "Institutional API integration layer",
                    "Unified billing for department profiles",
                    "SLA guaranteed uptime and support",
                    "Dedicated account training & support",
                  ].map((feat, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                      <CheckCircle2 size={14} className="text-[#F97316] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/evaluate"
                className="w-full text-center py-2.5 px-4 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 hover:border-orange-200 transition-all block cursor-pointer shadow-sm group-hover:shadow-md"
              >
                Contact Team
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          8. FAQ
          ───────────────────────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: "96px",
          paddingBottom: "96px",
          paddingLeft: "24px",
          paddingRight: "24px",
        }}
        className="max-w-4xl mx-auto bg-white w-full"
        id="faq"
      >
        <div
          className="section-heading text-center max-w-2xl mx-auto mb-16 w-full"
          style={{ opacity: 0 }}
        >
          <h2 className="text-xs font-bold text-[#7C3AED] uppercase tracking-widest mb-3">
            FAQ
          </h2>
          <h3 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Frequently Asked Questions
          </h3>
        </div>

        <div className="divide-y divide-slate-100 w-full">
          {faqsList.map((faq, index) => (
            <AccordionItem
              key={index}
              question={faq.q}
              answer={faq.a}
              index={index}
            />
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          9. FOOTER
          ───────────────────────────────────────────────────────────────────── */}
      <footer
        style={{
          paddingTop: "64px",
          paddingBottom: "64px",
          paddingLeft: "24px",
          paddingRight: "24px",
        }}
        className="bg-white max-w-7xl mx-auto border-t border-slate-100 w-full"
      >
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 pb-12 mb-8 w-full">
          <div>
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-xl text-[#0F172A] mb-3 group"
            >
              <span className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform duration-200">
                <BookOpen size={16} strokeWidth={2.5} />
              </span>
              Prep<span className="text-[#7C3AED]">Forge</span>
            </Link>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
              Automated high-precision answer verification and OMR auditing
              suite for JEE &amp; NEET institutes.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-16 gap-y-6">
            <div>
              <h5 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest mb-4">
                Product
              </h5>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/evaluate"
                    className="text-slate-500 hover:text-[#7C3AED] transition-colors"
                  >
                    Faculty Console
                  </Link>
                </li>
                <li>
                  <Link
                    href="#features"
                    className="text-slate-500 hover:text-[#7C3AED] transition-colors"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#workflow"
                    className="text-slate-500 hover:text-[#7C3AED] transition-colors"
                  >
                    How it works
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest mb-4">
                Company
              </h5>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/about"
                    className="text-slate-500 hover:text-[#7C3AED] transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="mailto:support@prepforge.com"
                    className="text-slate-500 hover:text-[#7C3AED] transition-colors"
                  >
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
            <Link href="/terms" className="hover:text-slate-600 transition-colors">
              Terms of Use
            </Link>
            <Link href="/privacy" className="hover:text-slate-600 transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
