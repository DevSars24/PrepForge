import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prisma kept as external (won't error even if Prisma imports exist but aren't called)
  serverExternalPackages: ['@prisma/client'],

  // Fix workspace root warning (multiple lockfiles detected)
  outputFileTracingRoot: path.join(process.cwd(), "../"),
};

export default nextConfig;
