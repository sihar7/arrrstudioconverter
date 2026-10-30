// ARRR Studio Converter — app desktop (Windows & macOS).
// Membungkus web produksi (login, kuota, riwayat tetap satu akun dengan web), plus fitur native:
// download langsung ke folder, progres taskbar/dock, notifikasi, menu klik kanan, update otomatis,
// dan VPN rumah (akun admin): pintu keluar YouTube untuk server saat IP server ditolak YouTube.
const os = require("node:os");
const path = require("node:path");
const { randomBytes } = require("node:crypto");
const { app, BrowserWindow, ipcMain, screen, session, shell } = require("electron");
const { APP_BASE, APP_ORIGIN, APP_URL, IN_APP_HOSTS, SESSION_COOKIE, UA_TOKEN, isAppUrl } = require("./config");
const store = require("./store");
const downloads = require("./downloads");
const updater = require("./updater");
const chrome = require("./chrome");
const { attachContextMenu, buildAppMenu } = require("./menu");
const { createTunnel } = require("./tunnel");
const { createTray, startedHidden } = require("./tray");

const OFFLINE_FILE = path.join(__dirname, "offline.html");
const ALLOWED_PERMISSIONS = new Set(["clipboard-read", "clipboard-sanitized-write", "notifications", "fullscreen"]);

let win = null;
let quitting = false;
let vpn = null;
let tray = null;
const getWindow = () => (win && !win.isDestroyed() ? win : null);

/** Tampilkan jendela (buat baru bila app berjalan di latar tanpa jendela) */
function showWindow() {
  const w = getWindow();
  if (!w) return createWindow();
  if (w.isMinimized()) w.restore();
  w.show();
  w.focus();
}

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
      additionalArguments: [`--arrr-origin=${APP_ORIGIN}`, `--arrr-base=${APP_BASE}`, `--arrr-version=${app.getVersion()}`],
    },
  });
  if (maximized) win.maximize();

  win.once("ready-to-show", () => win.show());

  // Simpan ukuran normal (bukan ukuran maximize) saat jendela ditutup.
  // VPN rumah aktif → jendela hanya disembunyikan, app tetap jalan di latar (ikon tray)
  win.on("close", (e) => {
    store.set("window", { bounds: win.getNormalBounds(), maximized: win.isMaximized() });
    if (quitting || !tray?.keepAlive()) return;
    e.preventDefault();
    win.hide();
    tray.hintOnce();
  });
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
    if (isAppUrl(url)) wc.loadURL(url);
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

/** Token VPN rumah = cookie sesi login web (server yang memutuskan: hanya admin aplikasi yang diterima) */
async function sessionToken() {
  const [c] = await session.defaultSession.cookies.get({ url: APP_URL, name: SESSION_COOKIE });
  return c?.value || null;
}

function startVpn() {
  let deviceId = store.get("vpn.deviceId", null);
  if (!deviceId) store.set("vpn.deviceId", (deviceId = randomBytes(12).toString("hex")));
  const osName = { win32: "Windows", darwin: "macOS" }[process.platform] ?? "Linux";
  tray = createTray({ showWindow, quit: () => app.quit(), vpn: { status: () => vpn.status() } });
  vpn = createTunnel({
    appUrl: APP_URL,
    getToken: sessionToken,
    deviceId,
    name: `${os.hostname()} (${osName})`,
    version: app.getVersion(),
    onStatus: (st) => {
      tray.update(st);
      getWindow()?.webContents.send("vpn:event", st);
      // Dibuka otomatis tanpa jendela tapi bukan akun admin → tidak ada gunanya jalan diam-diam
      if (st.state === "not-admin" && startedHidden() && !getWindow()) app.quit();
    },
  });
  // Login / logout di web → VPN langsung menyambung / berhenti
  session.defaultSession.cookies.on("changed", (_e, cookie, _cause, removed) => {
    if (cookie.name === SESSION_COOKIE) vpn.kick(removed);
  });
  ipcMain.handle("vpn:status", () => vpn.status());
  vpn.start();
}

app.on("second-instance", showWindow);

app.whenReady().then(async () => {
  hardenSession(session.defaultSession);
  buildAppMenu(getWindow);
  startVpn();
  // Mulai otomatis saat komputer menyala → tanpa jendela (cukup VPN + tray); belum login → tampilkan jendela login
  if (!startedHidden() || !(await sessionToken().catch(() => null))) createWindow();
  updater.init(getWindow);

  // macOS: klik ikon dock saat tidak ada jendela → buka lagi
  app.on("activate", showWindow);
});

app.on("before-quit", () => {
  quitting = true;
  vpn?.stop();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && !tray?.keepAlive()) app.quit();
});

// Lapisan keamanan terakhir: jendela/webview baru dari konten mana pun ditolak
app.on("web-contents-created", (_e, contents) => {
  contents.on("will-attach-webview", (e) => e.preventDefault());
});
