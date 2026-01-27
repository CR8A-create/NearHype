import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  sw: "sw.js",
});

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https' as const,
        hostname: 'img.clerk.com',
      },
      {
        protocol: 'https' as const,
        hostname: 'images.clerk.dev',
      },
    ],
  },
};

export default withPWA(nextConfig);
