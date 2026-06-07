import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrepForge — Faculty AI Evaluation Suite",
  description:
    "A production-oriented faculty suite for step-wise descriptive answer evaluation, OMR verification, and student performance analysis powered by AI.",
  keywords: [
    "AI evaluation",
    "faculty portal",
    "JEE",
    "NEET",
    "OMR checking",
    "answer sheet evaluation",
    "descriptive grading",
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-background text-foreground antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
