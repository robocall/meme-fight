import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.box.com",
      },
      {
        protocol: "https",
        hostname: "**.boxcloud.com",
      },
    ],
  },
};

export default nextConfig;
