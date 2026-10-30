import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The local stand-in database (development only) is loaded from node_modules
  // at runtime instead of being bundled, and left out of Vercel deployments,
  // which always use Neon.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Up to four recipe photos (each under 1 MB after shrinking) are sent to be
  // read in one go; Vercel accepts up to 4.5 MB per request.
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  outputFileTracingExcludes: {
    "/**": ["./node_modules/@electric-sql/pglite/**"],
  },
  // "Load recipes from files" on the Settings page reads these at runtime.
  outputFileTracingIncludes: {
    "/settings": ["./seed-recipes/*.md"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
