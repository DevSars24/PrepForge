"use client";

import Link from "next/link";
import { BookOpen, FileBadge, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

const navLinks = [
  { label: "How It Works", href: "/#workflow" },
  { label: "Resources", href: "/#evaluation" },
  { label: "Reports", href: "/#reports" },
  { label: "Faculty Demo", href: "/evaluate" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 26);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? "py-3" : "py-5"}`}>
      <div className="mx-auto max-w-[1180px] px-5">
        <div
          className={`flex h-12 items-center justify-between rounded-full px-4 transition-all duration-500 ${
            scrolled
              ? "border border-[#2B2548] bg-[#070812]/82 shadow-[0_16px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
              : "border border-transparent bg-transparent"
          }`}
        >
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#7564E8]/35 bg-[#171329] text-[#9D8DFF] shadow-[0_0_22px_rgba(117,100,232,0.24)]">
              <BookOpen size={13} strokeWidth={2.6} />
            </span>
            <span className="text-[18px] font-black tracking-tight text-white">
              Prep<span className="text-[#8D7BFF]">Forge</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-10 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[11px] font-black uppercase tracking-[0.26em] text-[#777B95] transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            <Link
              href="/evaluate"
              className="inline-flex items-center gap-2 rounded-full bg-[#7C6FE0] px-5 py-2.5 text-xs font-black text-white shadow-[0_0_30px_rgba(124,111,224,0.38)] transition hover:bg-[#9386FF]"
            >
              <FileBadge size={14} />
              Faculty Console
            </Link>
          </div>

          <button
            aria-label="Toggle navigation"
            onClick={() => setOpen((value) => !value)}
            className="rounded-full border border-white/10 p-2 text-white md:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {open && (
          <div className="mt-3 rounded-3xl border border-[#2B2548] bg-[#070812]/96 p-4 shadow-2xl backdrop-blur-2xl md:hidden">
            <div className="grid gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-3 py-3 text-xs font-black uppercase tracking-[0.22em] text-[#A2A6BA] hover:bg-white/[0.05] hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-white/10 pt-3">
                <Link
                  href="/evaluate"
                  onClick={() => setOpen(false)}
                  className="flex w-full justify-center items-center gap-2 rounded-full bg-[#7C6FE0] px-5 py-3 text-xs font-black text-white shadow-[0_0_30px_rgba(124,111,224,0.38)] hover:bg-[#9386FF]"
                >
                  <FileBadge size={14} />
                  Faculty Console
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
