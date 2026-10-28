// Update otomatis dari GitHub Releases (latest.yml / latest-mac.yml hasil electron-builder).
// Status dikirim ke halaman (IPC "update:event") → web menampilkan kartu interaktif: progres unduh → "Restart sekarang".
// Halaman yang tidak berlangganan (offline / web lama) → jatuh ke dialog sistem seperti dulu.
// Windows: unduh di latar → tawarkan restart. macOS tanpa sertifikat: beri tahu → buka halaman download.
const { app, dialog, ipcMain, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const { DOWNLOAD_PAGE, MAC_AUTO_INSTALL, UPDATE_INTERVAL_MS } = require("./config");

const PROGRESS_GAP_MS = 250;

let timer = null;
let manual = false; // dicek dari menu → tampilkan juga "sudah versi terbaru"
let prompted = false; // satu dialog sistem per versi, jangan muncul berulang tiap interval
let state = null; // status terakhir → dikirim ulang saat halaman (baru) berlangganan
let uiFor = null; // webContents yang sedang menampilkan kartu update
let lastProgress = 0;

const canInstall = process.platform !== "darwin" || MAC_AUTO_INSTALL;

function init(getWindow) {
  if (!app.isPackaged) return;
  autoUpdater.logger = null; // log bawaan terlalu berisik ("No published versions" sebelum rilis pertama)
  autoUpdater.autoDownload = canInstall;
  autoUpdater.autoInstallOnAppQuit = canInstall;

  const hasUi = () => {
    const wc = getWindow()?.webContents;
    return Boolean(wc && uiFor === wc && !wc.isDestroyed());
  };
  const emit = (payload, keep = true) => {
    if (keep) state = payload;
    if (hasUi()) getWindow().webContents.send("update:event", payload);
  };

  ipcMain.handle("update:subscribe", (e) => {
    uiFor = e.sender;
    // Halaman dimuat ulang / pindah ke halaman offline → berhenti dianggap punya kartu
    e.sender.once("did-start-loading", () => uiFor === e.sender && (uiFor = null));
    return state;
  });
  ipcMain.handle("update:install", () => {
    if (state?.type === "ready") setImmediate(() => autoUpdater.quitAndInstall());
  });
  ipcMain.handle("update:openPage", () => shell.openExternal(DOWNLOAD_PAGE));

  autoUpdater.on("update-available", async (info) => {
    if (canInstall) return emit({ type: "downloading", version: info.version, percent: 0, bps: 0 });
    emit({ type: "manual", version: info.version });
    if (hasUi() || prompted) return;
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

  autoUpdater.on("download-progress", (p) => {
    const now = Date.now();
    if (now - lastProgress < PROGRESS_GAP_MS || !state || state.type !== "downloading") return;
    lastProgress = now;
    emit({ ...state, percent: p.percent ?? 0, bps: p.bytesPerSecond ?? 0 });
  });

  autoUpdater.on("update-not-available", () => {
    emit({ type: "none" }, false);
    if (!manual) return;
    manual = false;
    dialog.showMessageBox(getWindow(), { type: "info", message: "Sudah versi terbaru", detail: `Versi ${app.getVersion()}` });
  });

  autoUpdater.on("update-downloaded", async (info) => {
    emit({ type: "ready", version: info.version });
    if (hasUi() || prompted) return;
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
    // Unduhan gagal di tengah jalan → kartu progres jangan menggantung
    if (state?.type === "downloading") {
      state = null;
      emit({ type: "error" }, false);
    }
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
  // Sudah terunduh → tidak perlu cek lagi; dari menu: tampilkan ulang tawarannya (kartu / dialog)
  if (state?.type === "ready") {
    if (fromMenu) {
      prompted = false;
      autoUpdater.emit("update-downloaded", { version: state.version });
    }
    return;
  }
  manual = fromMenu;
  if (fromMenu) prompted = false;
  autoUpdater.checkForUpdates().catch(() => {});
}

module.exports = { init, check };
