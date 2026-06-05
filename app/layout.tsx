import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrepForge - Faculty AI Evaluation Suite",
  description:
    "A production-oriented faculty suite for step-wise descriptive answers, OMR verification, and student evaluation analysis.",
  keywords: ["AI evaluation", "faculty portal", "JEE", "NEET", "OMR checking", "answer sheet evaluation"],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
