import type { Metadata } from "next";
import type { ReactNode } from "react";
import AuthProvider from "./components/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrepForge - Faculty AI Evaluation Suite",
  description:
    "A Clerk-secured faculty demo for JEE and NEET answer sheet evaluation, AI marks, feedback, OMR checking, and report generation.",
  keywords: ["AI evaluation", "faculty portal", "JEE", "NEET", "OMR checking", "answer sheet evaluation"],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
      <html lang="en" className="dark">
        <body className="min-h-screen bg-background text-foreground antialiased">
          <AuthProvider>{children}</AuthProvider>
        </body>
      </html>
  );
}
