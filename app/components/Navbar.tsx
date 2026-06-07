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
    <header className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <Link href="/" className="navbar-brand">
        <span className="navbar-brand-icon">
          <BookOpen size={16} strokeWidth={2.5} />
        </span>
        Prep<span style={{ color: "var(--accent)" }}>Forge</span>
      </Link>

      <nav className="navbar-links" style={{ display: "flex" }}>
        {navLinks.map((link) => (
          <Link key={link.label} href={link.href} className="navbar-link">
            {link.label}
          </Link>
        ))}

        {userId ? (
          <>
            <Link href="/evaluate" className="navbar-link active">
              Console
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: { width: 32, height: 32 },
                },
              }}
            />
          </>
        ) : (
          <Link href="/sign-in" className="navbar-cta">
            Sign In
          </Link>
        )}
      </nav>

      {/* Mobile toggle */}
      <button
        aria-label="Toggle navigation"
        onClick={() => setOpen((v) => !v)}
        className="navbar-link"
        style={{ display: "none" }}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>
    </header>
  );
}

