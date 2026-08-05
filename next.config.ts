import type { NextConfig } from "next";
import { nosticsStrip } from "@nostics/unplugin/strip-transform";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  transpilePackages: ["jose"],
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
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
  serverExternalPackages: ["@mem7ai/mem7"],
};

export default withSentryConfig(nextConfig, {
  // Automatically tree-shake Sentry logger statements to reduce bundle size
  silent: true,
  org: process.env.SENTRY_ORG || "axiomid",
  project: process.env.SENTRY_PROJECT || "sentry-purple-engine",
});
