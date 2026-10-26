// Base URL layanan eksternal — satu tempat, jangan hardcode di modul lain
const Url = {
  robloxCreatorDashboard: "https://create.roblox.com/dashboard/credentials",
  robloxCreations: "https://create.roblox.com/dashboard/creations",

  // Backend API (ARRSTUDIOCONVERTERBE di Railway) — /api/* web di-proxy ke sini (next.config.ts)
  backendApi: "https://arrrstudioconverterbe.up.railway.app",
  backendApiDev: "http://localhost:4000",

  // Installer app desktop (desktop/ → GitHub Releases). Nama file tetap → "latest/download" selalu versi terbaru
  desktopReleases: "https://github.com/sihar7/arrrstudioconverter/releases",
  desktopWindows: "https://github.com/sihar7/arrrstudioconverter/releases/latest/download/ARRR-Studio-Converter-Setup.exe",
  desktopMac: "https://github.com/sihar7/arrrstudioconverter/releases/latest/download/ARRR-Studio-Converter-mac.dmg",

  arrWebsite: "https://arrstudioweb.vercel.app/en",
  arrDiscord: "https://discord.gg/mtn3YmwjV",
} as const;

/** Halaman konfigurasi aset di Creator Dashboard (distribusi publik / Creator Store) */
export const robloxAssetConfigureUrl = (assetId: string) => `${Url.robloxCreations}/store/${assetId}/configure`;

export default Url;
