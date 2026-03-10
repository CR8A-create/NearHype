import withPWAInit from "@ducanh2912/next-pwa";
import { NextConfig } from "next";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  sw: "sw.js",
});

const nextConfig: NextConfig = {
  // Redirect www to non-www (Clerk cookies are set on nearhype.com)
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.nearhype.com" }],
        destination: "https://nearhype.com/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https" as const,
        hostname: "img.clerk.com",
      },
      {
        protocol: "https" as const,
        hostname: "images.clerk.dev",
      },
      {
        protocol: "https" as const,
        hostname: "utfs.io",
      },
    ],
  },
  turbopack: {},
  serverExternalPackages: ["uploadthing"],
};

export default withPWA(nextConfig);
