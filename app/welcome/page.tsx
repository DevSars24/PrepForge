"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Atom,
  Beaker,
  Calculator,
  Leaf,
  Zap,
  BookOpen,
  Radio,
  Trophy,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Heart,
} from "lucide-react";

type Stream = "JEE" | "NEET" | null;

export default function WelcomePage() {
  const { user, isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedStream, setSelectedStream] = useState<Stream>(null);
  const [activeCard, setActiveCard] = useState<number | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
    setMounted(true);
  }, [isLoaded, isSignedIn, router]);

  // Generate floating orbs for background
  const orbs = useMemo(
    () =>
      [...Array(5)].map((_, i) => ({
        size: 200 + Math.random() * 400,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: i * 0.5,
        color: ["purple", "cyan", "pink", "indigo", "violet"][i],
      })),
    []
  );

  if (!isLoaded || !isSignedIn) return null;

  // JEE subjects
  const jeeSubjects = [
    {
      title: "Physics",
      desc: "Mechanics, Electrostatics, Waves & Optics",
      icon: <Atom className="w-5 h-5" />,
      href: "/sessions",
      gradient: "from-orange-500 to-amber-600",
      glow: "orange",
    },
    {
      title: "Chemistry",
      desc: "Organic, Inorganic & Physical Chemistry",
      icon: <Beaker className="w-5 h-5" />,
      href: "/sessions",
      gradient: "from-cyan-500 to-blue-600",
      glow: "cyan",
    },
    {
      title: "Mathematics",
      desc: "Calculus, Algebra, Co-ordinate Geometry",
      icon: <Calculator className="w-5 h-5" />,
      href: "/sessions",
      gradient: "from-purple-500 to-indigo-600",
      glow: "purple",
    },
  ];

  // NEET subjects
  const neetSubjects = [
    {
      title: "Biology",
      desc: "Botany, Zoology, Genetics & Evolution",
      icon: <Leaf className="w-5 h-5" />,
      href: "/sessions",
      gradient: "from-emerald-500 to-green-600",
      glow: "emerald",
    },
    {
      title: "Physics",
      desc: "Optics, Electrostatics, Modern Physics",
      icon: <Atom className="w-5 h-5" />,
      href: "/sessions",
      gradient: "from-orange-500 to-amber-600",
      glow: "orange",
    },
    {
      title: "Chemistry",
      desc: "Organic reactions, Biomolecules, Solutions",
      icon: <Beaker className="w-5 h-5" />,
      href: "/sessions",
      gradient: "from-cyan-500 to-blue-600",
      glow: "cyan",
    },
  ];

  // Common quick actions (always visible)
  const commonActions = [
    {
      title: "Live Sessions",
      desc: "Talk with IITians & AIIMSians who cracked the exam",
      icon: <Radio className="w-5 h-5" />,
      href: "/sessions",
      gradient: "from-pink-500 to-rose-600",
      glow: "pink",
    },
  ];

  const activeSubjects = selectedStream === "JEE" ? jeeSubjects : selectedStream === "NEET" ? neetSubjects : [];

  const stats = [
    { label: "Mentors", value: "50+", icon: <GraduationCap className="w-4 h-4" /> },
    { label: "Live Sessions", value: "Weekly", icon: <Radio className="w-4 h-4" /> },
    { label: "Rank 1 Tips", icon: <Trophy className="w-4 h-4" />, value: "Inside" },
  ];

  return (
    <div className="min-h-screen bg-[#030303] text-white overflow-hidden">
      <Navbar />

      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), 
                              linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        {orbs.map((orb, i) => (
          <div
            key={i}
            className="absolute rounded-full blur-[100px] opacity-20 animate-float"
            style={{
              width: orb.size,
              height: orb.size,
              left: orb.left,
              top: orb.top,
              background: `radial-gradient(circle, var(--color-${orb.color}-500, #8b5cf6) 0%, transparent 70%)`,
              animationDelay: `${orb.delay}s`,
            }}
          />
        ))}
        <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-purple-950/30 via-transparent to-transparent" />
        <div className="absolute bottom-0 right-0 w-1/2 h-[400px] bg-gradient-to-tl from-cyan-950/20 to-transparent" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 pt-28 md:pt-36 pb-20 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">

          {/* Hero Section */}
          <div className={`text-center mb-16 transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-zinc-400">Welcome back to your preparation</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6">
              <span className="text-white">Hello, </span>
              <span className="relative">
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  {user?.firstName || "Aspirant"}
                </span>
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-purple-500/30" viewBox="0 0 200 8" preserveAspectRatio="none">
                  <path d="M0 7 Q50 0 100 4 T200 3" stroke="currentColor" strokeWidth="3" fill="none" />
                </svg>
              </span>
            </h1>

            <p className="text-lg md:text-xl text-zinc-500 max-w-xl mx-auto leading-relaxed mb-10">
              Choose your exam stream to get started.
              <span className="text-zinc-400"> Personalized sessions, notes & strategies await.</span>
            </p>

            {/* ═══ STREAM SELECTOR ═══ */}
            {!selectedStream ? (
              <div className={`max-w-2xl mx-auto transition-all duration-1000 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-600 font-semibold mb-6">Select your stream</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* JEE Card */}
                  <button
                    onClick={() => setSelectedStream("JEE")}
                    className="group relative text-left"
                  >
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative p-8 rounded-3xl bg-zinc-900/60 backdrop-blur-xl border border-white/5 hover:border-orange-500/30 transition-all duration-500 hover:-translate-y-1">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-500">
                        <GraduationCap className="w-7 h-7 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">JEE</h2>
                      <p className="text-zinc-500 text-sm mb-1">Engineering Entrance</p>
                      <p className="text-zinc-600 text-xs leading-relaxed">Physics · Chemistry · Mathematics</p>
                      <div className="flex items-center gap-2 mt-5 text-orange-400 text-sm font-bold">
                        Select JEE <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </button>

                  {/* NEET Card */}
                  <button
                    onClick={() => setSelectedStream("NEET")}
                    className="group relative text-left"
                  >
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative p-8 rounded-3xl bg-zinc-900/60 backdrop-blur-xl border border-white/5 hover:border-emerald-500/30 transition-all duration-500 hover:-translate-y-1">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-500">
                        <Heart className="w-7 h-7 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">NEET</h2>
                      <p className="text-zinc-500 text-sm mb-1">Medical Entrance</p>
                      <p className="text-zinc-600 text-xs leading-relaxed">Biology · Physics · Chemistry</p>
                      <div className="flex items-center gap-2 mt-5 text-emerald-400 text-sm font-bold">
                        Select NEET <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              // ═══ POST-SELECTION: Show stream + subjects ═══
              <div className={`transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                {/* Stream indicator + change button */}
                <div className="flex items-center justify-center gap-3 mb-8">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm border ${
                    selectedStream === "JEE"
                      ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  }`}>
                    {selectedStream === "JEE" ? <GraduationCap className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                    {selectedStream} Stream Selected
                  </div>
                  <button
                    onClick={() => setSelectedStream(null)}
                    className="text-xs text-zinc-500 hover:text-white transition-colors font-semibold underline underline-offset-2"
                  >
                    Change
                  </button>
                </div>

                {/* Quick Stats */}
                <div className={`flex justify-center gap-8 md:gap-16 mb-12 transition-all duration-1000 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
                  {stats.map((stat, i) => (
                    <div key={i} className="text-center group cursor-default">
                      <div className="flex items-center justify-center gap-2 text-zinc-500 mb-1 group-hover:text-purple-400 transition-colors">
                        {stat.icon}
                        <span className="text-xs uppercase tracking-wider font-medium">{stat.label}</span>
                      </div>
                      <p className="text-2xl md:text-3xl font-bold text-white">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Subject Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                  {activeSubjects.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => router.push(action.href)}
                      onMouseEnter={() => setActiveCard(idx)}
                      onMouseLeave={() => setActiveCard(null)}
                      className="group relative text-left"
                    >
                      <div
                        className={`absolute inset-0 rounded-3xl blur-xl transition-opacity duration-500 ${activeCard === idx ? "opacity-40" : "opacity-0"}`}
                        style={{ background: `linear-gradient(135deg, var(--color-${action.glow}-500, #8b5cf6), transparent)` }}
                      />
                      <div className="relative h-full p-7 rounded-3xl bg-zinc-900/60 backdrop-blur-xl border border-white/5 hover:border-white/10 transition-all duration-500 hover:-translate-y-1">
                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${action.gradient} mb-5 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                          {action.icon}
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">{action.title}</h3>
                        <p className="text-zinc-500 text-sm leading-relaxed mb-5">{action.desc}</p>
                        <div className="flex items-center text-zinc-500 group-hover:text-white transition-colors">
                          <span className="text-sm font-medium">Explore</span>
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Live Sessions CTA */}
                <div className="max-w-md mx-auto">
                  <button
                    onClick={() => router.push("/sessions")}
                    className="group w-full relative text-left"
                  >
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-pink-500/20 to-rose-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative p-6 rounded-3xl bg-zinc-900/60 backdrop-blur-xl border border-white/5 hover:border-pink-500/30 transition-all duration-500 flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-500">
                        <Radio className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">Live Sessions</h3>
                        <p className="text-zinc-500 text-sm">Talk with IITians & AIIMSians who cracked it</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom tag */}
          {selectedStream && (
            <div className={`text-center transition-all duration-1000 delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              <p className="text-zinc-600 text-xs uppercase tracking-[0.25em] font-medium mt-8">
                PrepForge • Your Exam Companion
              </p>
            </div>
          )}
        </div>
      </main>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(2deg); }
          66% { transform: translateY(10px) rotate(-1deg); }
        }
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}