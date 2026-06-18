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
  // Build with webpack (see the `--webpack` flag in package.json) so the
  // nostics strip transform below is actually applied. A `turbopack` key is
  // intentionally omitted: declaring it alongside a custom webpack config makes
  // the bundler choice ambiguous and the webpack hook is skipped under Turbopack.
  webpack: (config) => {
    nosticsStrip.webpack(config);
    return config;
  },
};

export default nextConfig;
