// Download: file hasil convert (/api/files/…?dl=1) & ekspor blob langsung disimpan ke folder download,
// progres di taskbar/dock, notifikasi saat selesai, status dikirim ke web lewat IPC (toast di halaman).
const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow, dialog, ipcMain, Notification, shell } = require("electron");
const { APP_ORIGIN } = require("./config");
const store = require("./store");

const MAX_FINISHED = 200; // batas riwayat path di memori (sesi panjang tetap ringan)
const active = new Map(); // id → DownloadItem (untuk progres gabungan)
const finished = new Map(); // id → path file (tombol "Tampilkan di folder")
let seq = 0;

const downloadDir = () => {
  const dir = store.get("downloadDir", "");
  return dir && fs.existsSync(dir) ? dir : app.getPath("downloads");
};

/** nama.mp3 → "nama (1).mp3" bila sudah ada, supaya file lama tidak tertimpa */
function uniquePath(dir, filename) {
  const safe = filename.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim() || "download";
  const { name, ext } = path.parse(safe);
  let candidate = path.join(dir, safe);
  for (let i = 1; fs.existsSync(candidate); i++) candidate = path.join(dir, `${name} (${i})${ext}`);
  return candidate;
}

function updateProgressBar(win) {
  if (win.isDestroyed()) return;
  let received = 0;
  let total = 0;
  for (const item of active.values()) {
    received += item.getReceivedBytes();
    total += item.getTotalBytes();
  }
  // -1 = sembunyikan; 2 = indeterminate (ukuran tidak diketahui)
  win.setProgressBar(active.size === 0 ? -1 : total > 0 ? received / total : 2);
}

function remember(id, file) {
  finished.set(id, file);
  if (finished.size > MAX_FINISHED) finished.delete(finished.keys().next().value);
}

function attach(win) {
  const send = (payload) => !win.isDestroyed() && win.webContents.send("download:event", payload);

  win.webContents.session.on("will-download", (_event, item) => {
    const id = ++seq;
    const savePath = uniquePath(downloadDir(), item.getFilename());
    const name = path.basename(savePath);
    item.setSavePath(savePath);
    active.set(id, item);
    send({ id, type: "started", name });

    item.on("updated", (_e, state) => {
      updateProgressBar(win);
      if (state === "progressing") send({ id, type: "progress", received: item.getReceivedBytes(), total: item.getTotalBytes() });
    });

    item.once("done", (_e, state) => {
      active.delete(id);
      item.removeAllListeners("updated");
      updateProgressBar(win);
      if (state === "completed") {
        remember(id, savePath);
        if (process.platform === "darwin") app.dock?.downloadFinished(savePath);
        if (!win.isDestroyed() && !win.isFocused() && Notification.isSupported()) {
          const n = new Notification({ title: "Download selesai", body: name });
          n.once("click", () => shell.showItemInFolder(savePath));
          n.show();
        }
      }
      send({ id, type: state === "completed" ? "done" : state === "cancelled" ? "cancelled" : "failed", name });
    });
  });
}

async function chooseFolder(win) {
  const r = await dialog.showOpenDialog(win, {
    title: "Pilih folder download",
    defaultPath: downloadDir(),
    properties: ["openDirectory", "createDirectory"],
  });
  if (!r.canceled && r.filePaths[0]) store.set("downloadDir", r.filePaths[0]);
  return downloadDir();
}

// IPC hanya dilayani untuk halaman web ARRR sendiri (bukan halaman Discord / file lokal)
const fromApp = (e) => {
  try {
    return new URL(e.senderFrame.url).origin === APP_ORIGIN;
  } catch {
    return false;
  }
};
const handle = (channel, fn) => ipcMain.handle(channel, (e, ...args) => (fromApp(e) ? fn(e, ...args) : null));

handle("download:show", (_e, id) => {
  const file = finished.get(Number(id));
  if (file && fs.existsSync(file)) shell.showItemInFolder(file);
  else shell.openPath(downloadDir());
});
handle("download:openFolder", () => shell.openPath(downloadDir()));
handle("download:getFolder", () => downloadDir());
handle("download:chooseFolder", (e) => chooseFolder(BrowserWindow.fromWebContents(e.sender)));

module.exports = { attach, chooseFolder, downloadDir };
