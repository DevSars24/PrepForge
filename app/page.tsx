"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useEffect, useRef } from "react";
import {
  FileText,
  ScanLine,
  Brain,
  BarChart3,
  Shield,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import gsap from "gsap";

const features = [
  {
    icon: <FileText size={22} />,
    title: "Descriptive Answer Evaluation",
    desc: "Upload scanned answer sheets or type text — AI grades every rubric point with Chain-of-Thought reasoning and evidence quotes.",
  },
  {
    icon: <ScanLine size={22} />,
    title: "OMR Sheet Processing",
    desc: "Upload bubble sheets and answer keys. The system reads filled bubbles, detects anomalies, and calculates scores automatically.",
  },
  {
    icon: <Brain size={22} />,
    title: "Chain-of-Thought AI",
    desc: "Every mark is justified with step-by-step reasoning — the AI explains what it checked, what matched, and why the score was awarded.",
  },
  {
    icon: <BarChart3 size={22} />,
    title: "Topic Gap Analysis",
    desc: "Identifies weak syllabus areas per student and generates targeted study recommendations tied to specific gaps.",
  },
  {
    icon: <Shield size={22} />,
    title: "Guardrail Scoring",
    desc: "Marks are clamped to rubric maximums. Weak evidence is flagged for faculty review — never auto-awarded without proof.",
  },
  {
    icon: <Sparkles size={22} />,
    title: "Multi-Provider OCR",
    desc: "Mistral OCR for handwriting + Gemini Vision fallback. If one provider fails, the system gracefully switches to the next.",
  },
];

const workflowSteps = [
  { num: "01", title: "Sign In", desc: "Authenticate securely with your faculty account." },
  { num: "02", title: "Enter Student Details", desc: "Fill in student name, roll number, batch, subject, and exam type." },
  { num: "03", title: "Upload & Configure", desc: "Upload answer sheets, OMR scans, and marking criteria." },
  { num: "04", title: "AI Evaluates", desc: "Chain-of-Thought grading with evidence-backed scores and insights." },
];

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const workflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero entrance
      gsap.from(".hero-badge", { opacity: 0, y: 20, duration: 0.6, delay: 0.1 });
      gsap.from(".hero-title", { opacity: 0, y: 30, duration: 0.7, delay: 0.2 });
      gsap.from(".hero-subtitle", { opacity: 0, y: 20, duration: 0.6, delay: 0.4 });
      gsap.from(".hero-actions", { opacity: 0, y: 20, duration: 0.6, delay: 0.55 });

      // Feature cards stagger
      gsap.from(".feature-card", {
        opacity: 0,
        y: 40,
        duration: 0.5,
        stagger: 0.1,
        delay: 0.8,
        ease: "power2.out",
      });

      // Workflow steps
      gsap.from(".workflow-step", {
        opacity: 0,
        x: -30,
        duration: 0.5,
        stagger: 0.12,
        delay: 1.2,
        ease: "power2.out",
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="hero" ref={heroRef}>
        <div className="hero-badge">
          <Sparkles size={14} />
          AI-Powered Faculty Evaluation Suite
        </div>

        <h1 className="hero-title">
          Grade Smarter with{" "}
          <span className="gradient-text">Chain-of-Thought AI</span>
        </h1>

        <p className="hero-subtitle">
          PrepForge evaluates descriptive answers and OMR sheets with step-by-step
          reasoning, evidence-backed scoring, and personalized gap analysis —
          built for JEE &amp; NEET faculty.
        </p>

        <div className="hero-actions">
          <Link href="/evaluate" className="btn-primary">
            Open Faculty Console <ArrowRight size={16} />
          </Link>
          <Link href="#features" className="btn-secondary">
            See Features <CheckCircle2 size={16} />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="features-section" id="features" ref={featuresRef}>
        <div className="features-heading">
          <h2>Everything Faculty Need</h2>
          <p>From OCR to grading to insights — one clean workflow.</p>
        </div>

        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section
        className="features-section"
        id="workflow"
        ref={workflowRef}
        style={{ paddingTop: 20 }}
      >
        <div className="features-heading">
          <h2>How It Works</h2>
          <p>Four simple steps from sign-in to results.</p>
        </div>

        <div style={{ display: "grid", gap: 16, maxWidth: 700, margin: "0 auto" }}>
          {workflowSteps.map((step, i) => (
            <div
              key={i}
              className="workflow-step"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "20px 24px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                transition: "all 0.2s ease",
              }}
            >
              <span
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  color: "var(--accent)",
                  opacity: 0.4,
                  minWidth: 48,
                }}
              >
                {step.num}
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)", marginBottom: 2 }}>
                  {step.title}
                </div>
                <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                  {step.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        PrepForge &copy; {new Date().getFullYear()} — Faculty AI Evaluation Suite
      </footer>
    </>
  );
}
