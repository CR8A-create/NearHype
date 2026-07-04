import withPWAInit from "@ducanh2912/next-pwa";
import { NextConfig } from "next";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  sw: "sw.js",
});

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Las llamadas WebRTC necesitan cámara/micrófono en el propio origen
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self)" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
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
