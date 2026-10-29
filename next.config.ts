import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The local stand-in database (development only) is loaded from node_modules
  // at runtime instead of being bundled, and left out of Vercel deployments,
  // which always use Neon.
  serverExternalPackages: ["@electric-sql/pglite"],
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
