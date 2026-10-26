// Konfigurasi app desktop — satu tempat, jangan hardcode di modul lain
const { app } = require("electron");

// URL web (subdomain sendiri, di root). Boleh berisi path bila web disajikan di sub-path (APP_BASE ikut).
// ARRR_APP_URL=http://localhost:3000 untuk mencoba web lokal (npm run dev)
const APP_URL = (process.env.ARRR_APP_URL || "https://bypass.arrstudio.com").replace(/\/$/, "");
const APP_ORIGIN = new URL(APP_URL).origin;
const APP_BASE = new URL(APP_URL).pathname.replace(/\/$/, "");

/** URL halaman web ARRR sendiri (origin sama + di bawah basePath) — bukan situs lain di domain yang sama */
function isAppUrl(url) {
  try {
    const u = new URL(url);
    return u.origin === APP_ORIGIN && (u.pathname === APP_BASE || u.pathname.startsWith(`${APP_BASE}/`) || !APP_BASE);
  } catch {
    return false;
  }
}

module.exports = {
  APP_URL,
  APP_ORIGIN,
  APP_BASE,
  isAppUrl,
  DOWNLOAD_PAGE: `${APP_URL}/download`,
  // Host yang boleh dibuka DI DALAM jendela app (login Discord OAuth); host lain → browser default
  IN_APP_HOSTS: new Set([new URL(APP_URL).host, "discord.com", "www.discord.com"]),
  // Penanda UA → web tahu dibuka dari app desktop (sembunyikan ajakan download, dsb.)
  UA_TOKEN: `ARRRStudioDesktop/${app.getVersion()}`,
  // macOS tanpa sertifikat Apple tidak bisa auto-install update → cukup beri tahu & buka halaman download
  MAC_AUTO_INSTALL: false,
  UPDATE_INTERVAL_MS: 6 * 60 * 60 * 1000,
  // Sama dengan token web (--bg / --fg di src/css/theme/tokens.css) supaya title bar & overlay menyatu
  COLORS: { dark: { bg: "#0d0e10", fg: "#e3e5e8" }, light: { bg: "#f2f3f5", fg: "#141517" } },
  // Tinggi title bar web (--bar-h) = tinggi tombol jendela Windows
  TITLE_BAR_HEIGHT: 48,
  // Menu bottom bar web (urutan sama) → pintasan CmdOrCtrl+1…
  NAV_SHORTCUTS: [
    { label: "Converter", path: "/converter" },
    { label: "YouTube", path: "/youtube" },
    { label: "Skybox", path: "/skybox" },
    { label: "Hapus background", path: "/remove-bg" },
    { label: "Upscale", path: "/upscale" },
    { label: "Audio saya", path: "/library" },
    { label: "Riwayat", path: "/history" },
  ],
};
