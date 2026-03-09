import withPWAInit from "@ducanh2912/next-pwa";
import { NextConfig } from "next";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  sw: "sw.js",
});

const nextConfig: NextConfig = {
  // Clerk proxy: routes Clerk traffic through /api/clerk instead of clerk.nearhype.com
  // This eliminates the need for clerk.nearhype.com and accounts.nearhype.com DNS CNAMEs
  async rewrites() {
    return [
      {
        source: "/api/clerk/:path*",
        destination: "https://clerk.nearhype.com/:path*",
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
