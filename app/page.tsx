"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import {
  Radio, BookOpen, Shield, Zap, Globe, BarChart3,
  ArrowRight, Sparkles, CheckCircle2, Lock, Users, ChevronRight, GraduationCap,
  Atom, Beaker, Calculator, Leaf, Brain, Trophy, FileText, CheckSquare, Star
} from "lucide-react";

// Animation helpers
const fw = (d = 0): any => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.6, delay: d, ease: [0.16, 1, 0.3, 1] },
});

export default function LandingPage() {
  const router = useRouter();

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#040508] text-[#F0F0F8] overflow-x-hidden font-sans relative">
        {/* Ambient Background Image */}
        <div
          className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/assets/main-page.jpg')",
            opacity: 0.40,
            filter: "brightness(0.8) contrast(1.05)",
          }}
        />
        {/* Radial vignette mask */}
        <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(4,5,8,0.15)_0%,rgba(4,5,8,0.75)_45%,#040508_95%)]" />

        {/* ════════════ HERO SECTION ════════════ */}
        <section className="relative pt-32 pb-24 md:pt-52 md:pb-40 px-6 max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center gap-20">
          {/* Background glows */}
          <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] bg-[#7868b8]/15 blur-[150px] rounded-full pointer-events-none" />
          <div className="absolute top-[30%] right-[10%] w-[500px] h-[500px] bg-[##7C6FE0]/10 blur-[150px] rounded-full pointer-events-none" />

          {/* Left Text */}
          <div className="flex-1 z-10 text-center lg:text-left relative">
            <motion.div {...fw(0)} className="mb-8 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#0F1120]/90 border border-[#7C6FE0]/30 text-[#A89FF5] text-xs font-medium tracking-wide backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7C6FE0] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7C6FE0]" />
              </span>
              Next-gen AI evaluations for JEE & NEET
            </motion.div>

            <motion.h1 {...fw(0.1)} className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold text-white tracking-tight leading-[1.05] mb-8 drop-shadow-[0_4px_24px_rgba(8,10,18,0.85)]">
              Crack JEE &amp; NEET <br className="hidden lg:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C6FE0] via-[#A89FF5] to-[#7C6FE0] bg-[length:200%_auto] animate-[gradientShift_8s_ease_infinite] drop-shadow-[0_2px_12px_rgba(124,111,224,0.35)]">
                with precision.
              </span>
            </motion.h1>

            <motion.p {...fw(0.2)} className="text-lg md:text-xl text-[#8B8FA8] mb-12 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
              PrepForge offers AI-powered OMR grading, descriptive answer evaluation, and expert faculty audits to ensure your preparation is flawless.
            </motion.p>

            <motion.div {...fw(0.3)} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5">
              <button onClick={() => router.push("/welcome")} className="relative group overflow-hidden px-10 py-4 rounded-full bg-gradient-to-r from-[#7C6FE0] to-[#8B7FE8] text-white font-semibold tracking-wide transition-all hover:scale-[1.02] border border-white/10 hover:border-white/30 shadow-[0_0_30px_rgba(124,111,224,0.35)] hover:shadow-[0_0_50px_rgba(124,111,224,0.65)] cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-r from-[#8B7FE8] to-[#7C6FE0] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="relative z-10 flex items-center gap-2">Start Evaluating Free <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></span>
              </button>
            </motion.div>
          </div>

          <motion.div {...fw(0.4)} className="flex-1 w-full max-w-2xl lg:max-w-none relative z-10">
            <div className="rounded-2xl bg-[#0A0B16]/90 border border-[#14172B] p-8 shadow-2xl border-t-2 border-t-[#7C6FE0]">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-[#7C6FE0]/10 rounded-xl text-[#7C6FE0]"><FileText size={24} /></div>
                <div>
                  <h3 className="font-bold">Instant Evaluation Ready</h3>
                  <p className="text-xs text-[#8B8FA8]">Upload your OMR or handwritten notes</p>
                </div>
              </div>
              <div className="h-4 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#7C6FE0] w-[65%]" />
              </div>
            </div>
          </motion.div>
        </section>

        {/* ════════════ FEATURES GRID ════════════ */}
        <section id="features" className="relative py-24 px-6 bg-[#020305]">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: <CheckSquare />, title: "OMR Evaluation", desc: "Upload your OMR sheets and get instant scores, rank predictions, and accuracy analysis." },
                { icon: <FileText />, title: "Descriptive Assessment", desc: "AI-driven grading for subjective answers with step-by-step logic and concept verification." },
                { icon: <Zap />, title: "Real-time Feedback", desc: "Know exactly which step you missed in a complex JEE derivation." },
              ].map((f, i) => (
                <div key={i} className="p-8 rounded-3xl border border-[#14172B] bg-[#0F1120] hover:border-[#7C6FE0]/30 transition-all">
                  <div className="text-[#7C6FE0] mb-4">{f.icon}</div>
                  <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                  <p className="text-[#8B8FA8] text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════ FACULTY EVALUATION ════════════ */}
        <section className="py-24 px-6 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block p-4 rounded-full bg-[#7C6FE0]/10 text-[#7C6FE0] mb-6">
              <Star size={32} />
            </div>
            <h2 className="text-4xl font-bold mb-6">Expert Faculty Audit</h2>
            <p className="text-[#8B8FA8] mb-12">Beyond AI, get your complex assignments and full-length papers manually reviewed by subject experts who have mentored hundreds of JEE/NEET rankers.</p>
            <div className="bg-[#0A0B16] border border-[#14172B] p-10 rounded-3xl text-left flex items-center gap-8">
              <div className="text-sm font-mono text-[#7C6FE0]">"Personalized guidance that AI can't touch."</div>
              <button className="px-6 py-3 rounded-full border border-white/10 hover:bg-white/5">Request Review</button>
            </div>
          </div>
        </section>

        {/* ════════════ FOOTER ════════════ */}
        <footer className="pt-16 pb-8 px-6 border-t border-slate-800/50">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-slate-800/50">
              <p className="text-xs text-slate-500">© 2025 PrepForge. All rights reserved.</p>
              <div className="flex gap-6 text-xs text-slate-500">
                <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
                <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
                <Link href="#" className="hover:text-white transition-colors">Contact</Link>
              </div>
            </div>
          </div>
        </footer>

      </main>
    </>
  );
}
