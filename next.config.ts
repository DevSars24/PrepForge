import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma kept as external (won't error even if Prisma imports exist but aren't called)
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
