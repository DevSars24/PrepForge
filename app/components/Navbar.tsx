"use client";

import Link from "next/link";
import { BookOpen, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth, UserButton } from "@clerk/nextjs";
import gsap from "gsap";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#workflow" },
];

export default function Navbar() {
  const { userId } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Entrance animation
  useEffect(() => {
    if (!headerRef.current) return;
    gsap.fromTo(
      headerRef.current,
      { y: -64, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.65, ease: "power3.out", delay: 0.1 }
    );
  }, []);

  return (
    <header
      ref={headerRef}
      style={{ opacity: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 md:px-12 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 border-b border-slate-100 shadow-sm backdrop-blur-sm"
          : "bg-white border-b border-transparent"
      }`}
    >
      <Link href="/" className="flex items-center gap-2.5 font-bold text-xl text-slate-900 group">
        <span className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform duration-200">
          <BookOpen size={16} strokeWidth={2.5} />
        </span>
        Prep<span className="text-[#7C3AED]">Forge</span>
      </Link>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-6">
        {navLinks.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors relative group"
          >
            {link.label}
            <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-[#7C3AED] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
          </Link>
        ))}

        {userId ? (
          <div className="flex items-center gap-4">
            <Link
              href="/evaluate"
              className="text-sm font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors relative group"
            >
              Console
              <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-[#7C3AED] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: { width: 32, height: 32 },
                },
              }}
            />
          </div>
        ) : (
          <Link
            href="/sign-in"
            className="group relative px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] transition-all shadow-sm overflow-hidden"
          >
            <span className="relative z-10">Sign In</span>
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-400 ease-in-out bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          </Link>
        )}
      </nav>

      {/* Mobile Toggle Button */}
      <button
        aria-label="Toggle navigation"
        onClick={() => setOpen((v) => !v)}
        className="block md:hidden p-2 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Menu Drawer */}
      {open && (
        <div className="absolute top-16 left-0 right-0 bg-white border-b border-slate-100 p-6 flex flex-col gap-4 shadow-lg animate-in fade-in slide-in-from-top-4 duration-200 z-50">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-base font-medium text-slate-600 hover:text-slate-900 transition-colors py-2"
            >
              {link.label}
            </Link>
          ))}

          <hr className="border-slate-100 my-1" />

          {userId ? (
            <div className="flex items-center justify-between py-2">
              <Link
                href="/evaluate"
                onClick={() => setOpen(false)}
                className="text-base font-semibold text-[#7C3AED] hover:text-[#6D28D9]"
              >
                Go to Console
              </Link>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: { width: 36, height: 36 },
                  },
                }}
              />
            </div>
          ) : (
            <Link
              href="/sign-in"
              onClick={() => setOpen(false)}
              className="w-full text-center px-5 py-3 rounded-lg text-base font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] transition-all shadow-sm"
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
