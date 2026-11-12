import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Acceptance builds can run alongside a developer's server without sharing generated files.
  distDir: process.env.GABAY_BUILD_DIR || ".next",
};
export default nextConfig;
