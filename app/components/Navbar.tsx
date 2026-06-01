"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { BrainCircuit, FileBadge, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

const navLinks = [
  { label: "Workflow", href: "/#workflow" },
  { label: "Faculty Demo", href: "/evaluate" },
  { label: "Future Features", href: "/#workflow" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all ${scrolled ? "py-3" : "py-5"}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between rounded-2xl border border-white/10 bg-[#06100F]/82 px-4 shadow-2xl backdrop-blur-xl sm:px-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-300 text-[#04100E]">
              <BrainCircuit size={19} strokeWidth={2.5} />
            </div>
            <span className="text-lg font-black tracking-tight text-white">
              Prep<span className="text-teal-200">Forge</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400 transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="rounded-xl border border-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:border-teal-300/40 hover:bg-teal-300/10">
                  Faculty Login
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/evaluate"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-300 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#04100E] transition hover:bg-teal-200"
              >
                <FileBadge size={14} />
                Console
              </Link>
              <UserButton />
            </SignedIn>
          </div>

          <button
            aria-label="Toggle navigation"
            onClick={() => setOpen((value) => !value)}
            className="rounded-xl border border-white/10 p-2 text-white md:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {open && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-[#06100F]/95 p-4 shadow-2xl backdrop-blur-xl md:hidden">
            <div className="grid gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-300 hover:bg-white/[0.05]"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 border-t border-white/10 pt-3">
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="w-full rounded-xl bg-teal-300 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#04100E]">
                      Faculty Login
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-3">
                    <Link href="/evaluate" onClick={() => setOpen(false)} className="text-xs font-black uppercase tracking-[0.16em] text-teal-200">
                      Open Console
                    </Link>
                    <UserButton />
                  </div>
                </SignedIn>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
