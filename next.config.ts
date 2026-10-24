import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Ikon diimpor per-modul (bukan seluruh barrel) → bundle klien lebih kecil, compile lebih cepat
  experimental: { optimizePackageImports: ["iconoir-react"] },
  // Paket yang memanggil binary / modul native → jangan di-bundle
  serverExternalPackages: ["ffmpeg-static", "ioredis", "ioredis-mock", "archiver"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "cdn.discordapp.com" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
