import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standard Next.js deployment — works on Vercel with serverless functions.
  // The app is fully browser-based: all data in IndexedDB, media via File System Access API.
  // The /api routes are deprecated stubs and do nothing at runtime.

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
