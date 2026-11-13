import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Acceptance builds can run alongside a developer's server without sharing generated files.
  distDir: process.env.GABAY_BUILD_DIR || ".next",
  // GitHub Codespaces can have limited available memory during page-data
  // collection. Run fewer build workers and reduce peak Webpack memory use.
  // Keep normal build concurrency for CI and deployed environments.
  ...(process.env.CODESPACES === "true" ? {
    experimental: {
      cpus: 1,
      webpackMemoryOptimizations: true,
    },
  } : {}),
};
export default nextConfig;
