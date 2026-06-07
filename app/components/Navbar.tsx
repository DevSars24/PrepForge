"use client";

import Link from "next/link";
import { BookOpen, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth, UserButton } from "@clerk/nextjs";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#workflow" },
];

export default function Navbar() {
  const { userId } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 md:px-12 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 border-b border-slate-100 shadow-sm backdrop-blur-sm"
          : "bg-white border-b border-transparent"
      }`}
    >
      <Link href="/" className="flex items-center gap-2.5 font-bold text-xl text-slate-900">
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-orange-500 flex items-center justify-center text-white shadow-sm">
          <BookOpen size={16} strokeWidth={2.5} />
        </span>
        Prep<span className="text-purple-600">Forge</span>
      </Link>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-6">
        {navLinks.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            {link.label}
          </Link>
        ))}

        {userId ? (
          <div className="flex items-center gap-4">
            <Link
              href="/evaluate"
              className="text-sm font-semibold text-purple-600 hover:text-purple-750 transition-colors"
            >
              Console
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
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-750 hover:to-orange-550 transition-all hover:scale-[1.02] shadow-sm"
          >
            Sign In
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
                className="text-base font-semibold text-purple-600 hover:text-purple-700"
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
              className="w-full text-center px-5 py-3 rounded-lg text-base font-semibold text-white bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 transition-all shadow-sm"
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
