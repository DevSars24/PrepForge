import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrepForge - Faculty AI Evaluation Suite",
  description:
    "A Clerk-secured faculty demo for JEE and NEET answer sheet evaluation, AI marks, feedback, OMR checking, and report generation.",
  keywords: ["AI evaluation", "faculty portal", "JEE", "NEET", "OMR checking", "answer sheet evaluation"],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const publishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_ZHVtbXkuY2xlcmsuYWNjb3VudHMuZGV2JA";

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <html lang="en" className="dark">
        <body className="min-h-screen bg-background text-foreground antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
