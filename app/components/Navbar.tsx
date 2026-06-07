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
    const onScroll = () => setScrolled(window.scrollY > 20);
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
              ? "border border-slate-200/60 bg-white/75 shadow-[0_12px_30px_rgba(0,0,0,0.03)] backdrop-blur-xl"
              : "border border-transparent bg-transparent"
          }`}
        >
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 text-indigo-600 shadow-sm">
              <BookOpen size={13} strokeWidth={2.6} />
            </span>
            <span className="text-[18px] font-black tracking-tight text-slate-900">
              Prep<span className="text-indigo-600">Forge</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-10 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[11px] font-black uppercase tracking-[0.26em] text-slate-500 transition hover:text-indigo-600"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            <Link
              href="/evaluate"
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-xs font-black text-white shadow-[0_4px_20px_rgba(79,70,229,0.25)] transition hover:bg-indigo-500 hover:shadow-[0_4px_25px_rgba(79,70,229,0.35)]"
            >
              <FileBadge size={14} />
              Faculty Console
            </Link>
          </div>

          <button
            aria-label="Toggle navigation"
            onClick={() => setOpen((value) => !value)}
            className="rounded-full border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 md:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {open && (
          <div className="mt-3 rounded-3xl border border-slate-200/60 bg-white/95 p-4 shadow-2xl backdrop-blur-xl md:hidden">
            <div className="grid gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-3 py-3 text-xs font-black uppercase tracking-[0.22em] text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-slate-100 pt-3">
                <Link
                  href="/evaluate"
                  onClick={() => setOpen(false)}
                  className="flex w-full justify-center items-center gap-2 rounded-full bg-indigo-600 px-5 py-3 text-xs font-black text-white shadow-[0_4px_20px_rgba(79,70,229,0.25)] hover:bg-indigo-500"
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
