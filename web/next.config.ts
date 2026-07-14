import type { NextConfig } from "next";

const repoName = "daily-financial-insights";
const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // Project Pages URL: https://linshanova-ops.github.io/daily-financial-insights/
  basePath: isGithubPages ? `/${repoName}` : undefined,
  assetPrefix: isGithubPages ? `/${repoName}/` : undefined,
  trailingSlash: true,
};

export default nextConfig;
