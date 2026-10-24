import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

// CSP: script inline masih diperlukan (skrip tema anti-kedip + bootstrap Next); asal eksternal dibatasi.
// vercel.live = toolbar komentar di deployment preview Vercel.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://vercel.live`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  `connect-src 'self' https://vercel.live wss://ws-us3.pusher.com${dev ? " ws: http://localhost:*" : ""}`,
  "frame-src https://vercel.live",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Respons API tidak boleh di-cache proxy/CDN bersama & tidak diindeks
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
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
