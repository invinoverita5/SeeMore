import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@chessinsights/analysis",
    "@chessinsights/analytics",
    "@chessinsights/chesscom-client",
    "@chessinsights/domain",
    "@chessinsights/importer"
  ],
  webpack(config) {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"]
    };

    return config;
  }
};

export default nextConfig;
