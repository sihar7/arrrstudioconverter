import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import Url from "./src/Url/Url";

// Versi app mobile (mobile/pubspec.yaml) → link APK/IPA di halaman Download menunjuk rilis tag mobile-v<versi>
const mobileVersion = (() => {
  try {
    return readFileSync("mobile/pubspec.yaml", "utf8").match(/^version:\s*([^+\s]+)/m)?.[1] ?? "";
  } catch {
    return "";
  }
})();

const dev = process.env.NODE_ENV !== "production";
// Semua proses server ada di backend (ARRSTUDIOCONVERTERBE); /api/* di-proxy ke sana → cookie tetap milik domain web
const backend = (process.env.BACKEND_URL || (dev ? Url.backendApiDev : Url.backendApi)).replace(/\/$/, "");

// CSP: script inline masih diperlukan (skrip tema anti-kedip + bootstrap Next); asal eksternal dibatasi.
// vercel.live = toolbar komentar di deployment preview Vercel.
const csp = [
  "default-src 'self'",
  // wasm-unsafe-eval: hanya izin kompilasi WebAssembly (runtime AI Hapus background & Upscale), bukan eval JS
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""} https://vercel.live`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  // huggingface.co + *.hf.co: unduh model AI (sekali, lalu di-cache browser)
  // itunes.apple.com + *.mzstatic.com: artis & cover album antrean · i.ytimg.com: thumbnail → gambar Decal
  `connect-src 'self' https://vercel.live wss://ws-us3.pusher.com https://huggingface.co https://*.hf.co https://itunes.apple.com https://*.mzstatic.com https://i.ytimg.com${dev ? " ws: http://localhost:*" : ""}`,
  // youtube-nocookie: pemutar embed di halaman YouTube (web)
  "frame-src https://vercel.live https://www.youtube-nocookie.com",
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
  // Web di subdomain sendiri (bypass.arrrstudio.com) → di root, tanpa basePath. Kalau suatu saat pindah ke
  // sub-path, isi Url.basePath; withBase() di kode sudah siap untuk itu.
  ...(Url.basePath ? { basePath: Url.basePath } : {}),
  poweredByHeader: false,
  // Penanda build: dibaked ke bundle klien & ke /build-id → tab yang masih terbuka tahu ada deploy baru (UpdateWatcher)
  env: {
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now()),
    NEXT_PUBLIC_MOBILE_VERSION: mobileVersion,
  },
  async redirects() {
    // Domain lama (*.vercel.app produksi) → domain publik. Server hanya menerima request dari APP_URL
    // (cek lintas situs), jadi pengunjung lama dialihkan supaya tidak kena "Permintaan lintas situs ditolak".
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "arrrstudioconverter.vercel.app" }],
        destination: `${Url.site}/:path*`,
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Aset statis di public/ (logo, tekstur material) → cache 1 tahun (rule "Add Expires headers").
      // Ganti isi file = ganti nama file (mis. forged-dark-2.webp) supaya cache lama tidak terpakai.
      { source: "/:dir(brand|material)/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      // Runtime WASM AI: nama file mengikuti versi onnxruntime-web → cache seminggu cukup
      { source: "/ort/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] },
      // Favicon: URL-nya sudah ber-hash (?icon.xxx) dari Next → aman di-cache lama
      { source: "/:icon(icon.png|apple-icon.png)", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      // Respons API tidak boleh di-cache proxy/CDN bersama & tidak diindeks
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Ikon diimpor per-modul (bukan seluruh barrel) → bundle klien lebih kecil, compile lebih cepat
  experimental: {
    optimizePackageImports: ["iconoir-react"],
    // Cache build Turbopack (default aktif di 16.4) + .next/cache yang dipulihkan Vercel pernah menyajikan CSS basi
    // (aturan baru di globals.css hilang di produksi). Build selalu bersih — sedikit lebih lama, hasil pasti benar.
    turbopackFileSystemCacheForBuild: false,
    // Gabungkan chunk JS sekecil mungkin jumlahnya: kunjungan pertama (landing) jadi 2–3 file, bukan ±14.
    // Biaya: chunk lebih besar & sedikit duplikasi antar-halaman — tetap ter-cache immutable 1 tahun.
    turbopackChunking: {
      firstPageLoadPriority: 1,
      priorityRoutes: [/^\/$/],
      priorityBoost: 4,
      requestCost: 5_000_000,
      minChunkSize: 5_000_000,
      maxMergeChunkSize: 50_000_000,
      maxChunkCountPerGroup: 1,
    },
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
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
