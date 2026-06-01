import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReactNode } from "react";
import { Metadata } from "next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PrepForge — JEE & NEET Preparation Platform",
  description:
    "Crack JEE and NEET with PrepForge. Access live sessions with IITians & AIIMSians, AI-powered doubt solving, mock tests, and chapter-wise notes — all in one place.",
  keywords: ["JEE preparation", "NEET preparation", "IIT", "AIIMS", "JEE mains", "NEET 2024", "exam prep", "live doubt sessions"],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={`${inter.className} min-h-screen bg-background text-foreground selection:bg-[#7C6FE0]/30 selection:text-[#F0F0F8] antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
