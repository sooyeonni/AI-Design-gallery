import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.GITHUB_PAGES === "true" ? {
    output: "export",
    basePath: "/AI-Design-gallery",
    trailingSlash: true,
    images: { unoptimized: true },
  } : {}),
};

export default nextConfig;
