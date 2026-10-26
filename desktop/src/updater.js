// Update otomatis dari GitHub Releases (latest.yml / latest-mac.yml hasil electron-builder).
// Windows: unduh di latar → tawarkan restart. macOS tanpa sertifikat: beri tahu → buka halaman download.
const { app, dialog, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const { DOWNLOAD_PAGE, MAC_AUTO_INSTALL, UPDATE_INTERVAL_MS } = require("./config");

let timer = null;
let manual = false; // dicek dari menu → tampilkan juga "sudah versi terbaru"
let prompted = false; // satu dialog per versi, jangan muncul berulang tiap interval

const canInstall = process.platform !== "darwin" || MAC_AUTO_INSTALL;

function init(getWindow) {
  if (!app.isPackaged) return;
  autoUpdater.logger = null; // log bawaan terlalu berisik ("No published versions" sebelum rilis pertama)
  autoUpdater.autoDownload = canInstall;
  autoUpdater.autoInstallOnAppQuit = canInstall;

  autoUpdater.on("update-available", async (info) => {
    if (canInstall || prompted) return;
    prompted = true;
    const { response } = await dialog.showMessageBox(getWindow(), {
      type: "info",
      buttons: ["Download", "Nanti"],
      defaultId: 0,
      cancelId: 1,
      message: `Versi ${info.version} tersedia`,
      detail: "Download installer terbaru lalu seret ke folder Applications untuk memperbarui.",
    });
    if (response === 0) shell.openExternal(DOWNLOAD_PAGE);
  });

  autoUpdater.on("update-not-available", () => {
    if (!manual) return;
    manual = false;
    dialog.showMessageBox(getWindow(), { type: "info", message: "Sudah versi terbaru", detail: `Versi ${app.getVersion()}` });
  });

  autoUpdater.on("update-downloaded", async (info) => {
    if (prompted) return;
    prompted = true;
    const { response } = await dialog.showMessageBox(getWindow(), {
      type: "info",
      buttons: ["Restart sekarang", "Nanti"],
      defaultId: 0,
      cancelId: 1,
      message: `Update ${info.version} siap dipasang`,
      detail: "Aplikasi akan ditutup sebentar lalu dibuka lagi. Kalau pilih Nanti, update dipasang saat aplikasi ditutup.",
    });
    if (response === 0) setImmediate(() => autoUpdater.quitAndInstall());
  });

  autoUpdater.on("error", (err) => {
    console.warn("[updater]", err?.message || err);
    if (manual) {
      manual = false;
      dialog.showMessageBox(getWindow(), { type: "warning", message: "Gagal mengecek update", detail: "Periksa koneksi internet lalu coba lagi." });
    }
  });

  check();
  timer = setInterval(check, UPDATE_INTERVAL_MS);
  app.once("before-quit", () => clearInterval(timer));
}

function check(fromMenu = false) {
  if (!app.isPackaged) {
    if (fromMenu) dialog.showMessageBox({ type: "info", message: "Update hanya aktif di versi terpasang." });
    return;
  }
  manual = fromMenu;
  if (fromMenu) prompted = false;
  autoUpdater.checkForUpdates().catch(() => {});
}

module.exports = { init, check };
