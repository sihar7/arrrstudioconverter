// Konfigurasi app desktop — satu tempat, jangan hardcode di modul lain
const { app } = require("electron");

// ARRR_APP_URL=http://localhost:3000 untuk mencoba web lokal (npm run dev)
const APP_URL = (process.env.ARRR_APP_URL || "https://arrrstudioconverter.vercel.app").replace(/\/$/, "");
const APP_ORIGIN = new URL(APP_URL).origin;

module.exports = {
  APP_URL,
  APP_ORIGIN,
  DOWNLOAD_PAGE: `${APP_URL}/download`,
  // Host yang boleh dibuka DI DALAM jendela app (login Discord OAuth); host lain → browser default
  IN_APP_HOSTS: new Set([new URL(APP_URL).host, "discord.com", "www.discord.com"]),
  // Penanda UA → web tahu dibuka dari app desktop (sembunyikan ajakan download, dsb.)
  UA_TOKEN: `ARRRStudioDesktop/${app.getVersion()}`,
  // macOS tanpa sertifikat Apple tidak bisa auto-install update → cukup beri tahu & buka halaman download
  MAC_AUTO_INSTALL: false,
  UPDATE_INTERVAL_MS: 6 * 60 * 60 * 1000,
  COLORS: { dark: "#0f0f11", light: "#f4f4f5" },
};
