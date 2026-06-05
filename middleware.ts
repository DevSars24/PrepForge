import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/evaluate(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/evaluate",
  "/api/grade",
  "/api/ocr",
  "/api/omr",
  "/api/evaluations",
  "/api/gemini",
]);

export default clerkMiddleware((auth, req) => {
  const hasClerkConfig =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_") &&
    Boolean(process.env.CLERK_SECRET_KEY) &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("your_");

  if (!hasClerkConfig) return;

  if (!isPublicRoute(req)) {
    auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
