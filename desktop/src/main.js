// ARRR Studio Converter — app desktop (Windows & macOS).
// Membungkus web produksi (login, kuota, riwayat tetap satu akun dengan web), plus fitur native:
// download langsung ke folder, progres taskbar/dock, notifikasi, menu klik kanan, update otomatis.
const path = require("node:path");
const { app, BrowserWindow, screen, session, shell } = require("electron");
const { APP_ORIGIN, APP_URL, IN_APP_HOSTS, UA_TOKEN } = require("./config");
const store = require("./store");
const downloads = require("./downloads");
const updater = require("./updater");
const chrome = require("./chrome");
require("./youtube"); // daftarkan IPC YouTube-di-dalam-app
const { attachContextMenu, buildAppMenu } = require("./menu");

const OFFLINE_FILE = path.join(__dirname, "offline.html");
const ALLOWED_PERMISSIONS = new Set(["clipboard-read", "clipboard-sanitized-write", "notifications", "fullscreen"]);

let win = null;
const getWindow = () => (win && !win.isDestroyed() ? win : null);

if (!app.requestSingleInstanceLock()) app.quit();
if (process.platform === "win32") app.setAppUserModelId("app.arrrstudio.converter");

const isInApp = (url) => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? IN_APP_HOSTS.has(u.host) : false;
  } catch {
    return false;
  }
};
const isOfflinePage = (url) => url.startsWith("file:") && url.includes("offline.html");
const openExternal = (url) => /^https?:\/\//.test(url) && shell.openExternal(url);

/** Posisi & ukuran terakhir — dibuang kalau monitornya sudah tidak ada */
function restoreBounds() {
  const saved = store.get("window", null);
  const base = { width: 1280, height: 820 };
  if (!saved?.bounds) return { ...base, maximized: false };
  const area = screen.getDisplayMatching(saved.bounds).workArea;
  const { x, y, width, height } = saved.bounds;
  const visible = x < area.x + area.width - 80 && x + width > area.x + 80 && y >= area.y - 10 && y < area.y + area.height - 80;
  return visible ? { x, y, width, height, maximized: Boolean(saved.maximized) } : { ...base, maximized: Boolean(saved.maximized) };
}

function hardenSession(ses) {
  // UA Chrome biasa + penanda ARRR (tanpa token "Electron/…" supaya login Discord tidak memperlakukannya beda)
  const ua = ses.getUserAgent().replace(/\s?Electron\/\S+/, "").replace(/\s?arrr-studio-converter-desktop\/\S+/i, "");
  ses.setUserAgent(`${ua} ${UA_TOKEN}`);

  const fromApp = (url) => {
    try {
      return new URL(url).origin === APP_ORIGIN;
    } catch {
      return false;
    }
  };
  ses.setPermissionRequestHandler((wc, permission, cb, details) => cb(ALLOWED_PERMISSIONS.has(permission) && fromApp(details.requestingUrl || wc.getURL())));
  ses.setPermissionCheckHandler((_wc, permission, origin) => ALLOWED_PERMISSIONS.has(permission) && fromApp(origin));
}

function createWindow() {
  const { maximized, ...bounds } = restoreBounds();
  win = new BrowserWindow({
    ...bounds,
    minWidth: 640,
    minHeight: 560,
    show: false,
    title: "ARRR Studio Converter",
    // Tanpa title bar bawaan: web menggambar title bar + sidebar sendiri (lihat chrome.js)
    ...chrome.windowOptions(),
    // Versi terpasang memakai ikon dari exe/app bundle; saat dev pakai PNG dari build/
    icon: app.isPackaged ? undefined : path.join(__dirname, "..", "build", "icon-win.png"),
    autoHideMenuBar: process.platform === "win32",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false,
      additionalArguments: [`--arrr-origin=${APP_ORIGIN}`, `--arrr-version=${app.getVersion()}`],
    },
  });
  if (maximized) win.maximize();

  win.once("ready-to-show", () => win.show());

  // Simpan ukuran normal (bukan ukuran maximize) saat jendela ditutup
  win.on("close", () => store.set("window", { bounds: win.getNormalBounds(), maximized: win.isMaximized() }));
  win.on("closed", () => {
    win = null;
  });

  const wc = win.webContents;

  // Navigasi: web ARRR & login Discord di dalam app; selain itu ke browser default
  wc.on("will-navigate", (e, url) => {
    if (url.replace(/\/$/, "") === APP_URL) {
      e.preventDefault();
      wc.loadURL(`${APP_URL}/converter`);
      return;
    }
    if (isInApp(url) || isOfflinePage(url)) return;
    e.preventDefault();
    openExternal(url);
  });
  wc.setWindowOpenHandler(({ url }) => {
    if (isInApp(url) && new URL(url).origin === APP_ORIGIN) wc.loadURL(url);
    else openExternal(url);
    return { action: "deny" };
  });
  wc.on("will-attach-webview", (e) => e.preventDefault());

  // Gagal memuat (offline / server down) → layar offline dengan tombol coba lagi
  wc.on("did-fail-load", (_e, code, _desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3 || isOfflinePage(url)) return; // -3 = dibatalkan (navigasi baru)
    win.loadFile(OFFLINE_FILE, { query: { url: isInApp(url) ? url : APP_URL } });
  });

  wc.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") return;
    const mod = process.platform === "darwin" ? input.meta : input.control;
    if (mod && input.shift && input.alt && input.code === "KeyA") {
      e.preventDefault();
      wc.loadURL(`${APP_URL}/admin/login`);
    }
  });

  // Tombol mouse back/forward (Windows)
  win.on("app-command", (_e, cmd) => {
    if (cmd === "browser-backward") wc.navigationHistory.goBack();
    if (cmd === "browser-forward") wc.navigationHistory.goForward();
  });

  attachContextMenu(win);
  chrome.attach(win);
  downloads.attach(win);
  startUrl().then((url) => !win.isDestroyed() && win.loadURL(url));
}

/** Halaman pertama: belum login → Login dulu (cek sesi sendiri, tidak bergantung versi web). Gagal cek → Converter. */
async function startUrl() {
  try {
    const res = await session.defaultSession.fetch(`${APP_URL}/api/auth/me`, { signal: AbortSignal.timeout(8000) });
    const me = await res.json();
    if (res.ok && !me?.user) return `${APP_URL}/login?next=%2Fconverter`;
  } catch {
    /* offline / server sibuk → biar halaman & layar offline yang menangani */
  }
  return `${APP_URL}/converter`;
}

app.on("second-instance", () => {
  const w = getWindow();
  if (!w) return;
  if (w.isMinimized()) w.restore();
  w.focus();
});

app.whenReady().then(() => {
  hardenSession(session.defaultSession);
  buildAppMenu(getWindow);
  createWindow();
  updater.init(getWindow);

  // macOS: klik ikon dock saat tidak ada jendela → buka lagi
  app.on("activate", () => {
    if (!getWindow()) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Lapisan keamanan terakhir: jendela/webview baru dari konten mana pun ditolak
app.on("web-contents-created", (_e, contents) => {
  contents.on("will-attach-webview", (e) => e.preventDefault());
});
