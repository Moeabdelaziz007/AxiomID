import type { NextConfig } from "next";
import { nosticsStrip } from "@nostics/unplugin/strip-transform";

const nextConfig: NextConfig = {
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
  turbopack: {},
  webpack: (config) => {
    nosticsStrip.webpack(config);
    return config;
  },
};

export default nextConfig;
