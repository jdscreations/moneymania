import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Shared workspace packages ship TypeScript source.
  transpilePackages: ["@moneymania/core", "@moneymania/db"],
  cacheComponents: true,
  partialPrefetching: true,
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
