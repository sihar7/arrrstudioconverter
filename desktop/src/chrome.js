// Bingkai jendela: title bar bawaan disembunyikan, web ARRR menggambar title bar + bottom bar sendiri.
// Windows: tombol minimize/maximize/close native digambar di atas web (Window Controls Overlay) dan warnanya
// mengikuti tema web. macOS: tombol lampu lalu lintas tetap native, di pojok kiri title bar web.
const { BrowserWindow, ipcMain } = require("electron");
const { APP_ORIGIN, APP_URL, COLORS, NAV_SHORTCUTS, TITLE_BAR_HEIGHT } = require("./config");
const store = require("./store");

const isMac = process.platform === "darwin";
const savedTheme = () => (store.get("theme", "dark") === "light" ? "light" : "dark");
const overlay = (theme) => ({ color: COLORS[theme].bg, symbolColor: COLORS[theme].fg, height: TITLE_BAR_HEIGHT });

/** Opsi BrowserWindow untuk bingkai custom (tema terakhir dipakai sejak frame pertama → tanpa kedip warna) */
function windowOptions() {
  const theme = savedTheme();
  return {
    titleBarStyle: "hidden",
    backgroundColor: COLORS[theme].bg,
    ...(isMac ? { trafficLightPosition: { x: 18, y: 17 } } : { titleBarOverlay: overlay(theme) }),
  };
}

// Halaman luar yang dibuka di dalam app (login Discord) tidak punya title bar → beri strip seret transparan
const EXTERNAL_DRAG_CSS = `html::before{content:"";position:fixed;inset:0 0 auto;height:${TITLE_BAR_HEIGHT}px;z-index:2147483647;-webkit-app-region:drag}`;

/** Pindah halaman: di web ARRR lewat router (tanpa muat ulang); di halaman lain (offline, Discord) muat biasa */
function navigate(win, path) {
  if (!win || win.isDestroyed()) return;
  if (win.webContents.getURL().startsWith(APP_ORIGIN)) win.webContents.send("app:navigate", path);
  else win.loadURL(`${APP_URL}${path}`);
}

function attach(win) {
  const wc = win.webContents;
  // Windows: menu bar tidak tampil (title bar sendiri) → pintasan Ctrl+1… ditangani langsung di sini
  if (!isMac) {
    wc.on("before-input-event", (e, input) => {
      if (input.type !== "keyDown" || !input.control || input.shift || input.alt) return;
      const target = NAV_SHORTCUTS[Number(input.key) - 1];
      if (!target) return;
      e.preventDefault();
      navigate(win, target.path);
    });
  }
  wc.on("did-finish-load", () => {
    const url = wc.getURL();
    if (/^https?:/.test(url) && !url.startsWith(APP_ORIGIN)) wc.insertCSS(EXTERNAL_DRAG_CSS).catch(() => {});
  });
}

const fromApp = (e) => {
  try {
    return new URL(e.senderFrame.url).origin === APP_ORIGIN;
  } catch {
    return false;
  }
};

// Web memberi tahu tema aktif → warna overlay tombol jendela + latar jendela ikut berganti
ipcMain.on("window:theme", (e, value) => {
  if (!fromApp(e)) return;
  const theme = value === "light" ? "light" : "dark";
  if (store.get("theme") !== theme) store.set("theme", theme);
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win || win.isDestroyed()) return;
  win.setBackgroundColor(COLORS[theme].bg);
  if (!isMac) win.setTitleBarOverlay(overlay(theme));
});

module.exports = { windowOptions, attach, navigate };
