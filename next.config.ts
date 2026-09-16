import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Ảnh admin upload qua Vercel Blob
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
