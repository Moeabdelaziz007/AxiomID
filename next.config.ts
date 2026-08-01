import type { NextConfig } from "next";
import { nosticsStrip } from "@nostics/unplugin/strip-transform";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  transpilePackages: ["jose"],
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
      {
        protocol: "https",
        hostname: "*.cloudflareimages.com",
      },
      {
        protocol: "https",
        hostname: "axiomid.app",
      },
    ],
  },
  typedRoutes: true,
  webpack: (config) => {
    nosticsStrip.webpack(config);
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  // Automatically tree-shake Sentry logger statements to reduce bundle size
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
