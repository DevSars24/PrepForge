"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const fallbackPublishableKey = "pk_test_ZHVtbXkuY2xlcmsuYWNjb3VudHMuZGV2JA";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname?.startsWith("/evaluate")) {
    return <>{children}</>;
  }

  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || fallbackPublishableKey;

  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}
