// Mode Alice (admin): Claude.ai ASLI di dalam app — WebContentsView di atas area kerja halaman /alice web ARRR.
// Memakai langganan Claude (Pro) user sendiri lewat situs resmi, bukan API. 3 profil login terpisah
// (persist:claude-1..3) → ganti akun sekali klik tanpa logout. Tanpa preload: Claude.ai tidak bisa mengakses bridge ARRR.
// Alat ARRR (statistik, memori Alice, dll.) masuk lewat konektor ARRR STUDIO yang dipasang di tiap akun Claude.
const { BrowserWindow, clipboard, ipcMain, Menu, session, shell, WebContentsView } = require("electron");
const { COLORS, isAppUrl } = require("./config");
const store = require("./store");

const HOME = "https://claude.ai/new";
const PROFILES = 3;
// Boleh dibuka di dalam view: Claude + login (Google / Apple / SSO Anthropic); selain itu → browser default
const IN_VIEW =
  /(^|\.)(claude\.ai|claude\.com|anthropic\.com|accounts\.google\.com|google\.com|gstatic\.com|googleusercontent\.com|appleid\.apple\.com|apple\.com|cloudflare\.com)$/i;
const ALLOWED_PERMISSIONS = new Set(["clipboard-read", "clipboard-sanitized-write", "fullscreen", "notifications", "media"]);

const views = new Map(); // profil → WebContentsView
let active = Math.min(PROFILES, Math.max(1, Number(store.get("claudeProfile", 1)) || 1));
let host = null;
let bounds = null;
let shown = false;

/** Halaman login pihak ketiga yang dibuka Claude.ai sebagai popup (Google / Apple) */
const isAuthPopup = (url) => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && /(^|\.)(accounts\.google\.com|appleid\.apple\.com)$/i.test(u.hostname);
  } catch {
    return false;
  }
};

/** Link login dari email Claude (magic link) — hanya domain Claude */
const isClaudeLink = (url) => {
  try {
    const u = new URL(String(url).trim());
    return u.protocol === "https:" && /(^|\.)(claude\.ai|claude\.com)$/i.test(u.hostname);
  } catch {
    return false;
  }
};

const isInView = (url) => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && IN_VIEW.test(u.hostname);
  } catch {
    return false;
  }
};

// Menutup jendela (app tetap jalan di tray) menghancurkan view yang menempel padanya → view mati dibuang &
// dibuat ulang saat dibutuhkan (login tetap ada: sesi persist:claude-N tersimpan di disk)
const alive = (v) => Boolean(v && !v.webContents.isDestroyed());
function current() {
  const v = views.get(active);
  if (alive(v)) return v;
  views.delete(active);
  return null;
}

function state() {
  const wc = current()?.webContents;
  return {
    profile: active,
    profiles: PROFILES,
    url: wc?.getURL() ?? "",
    title: wc?.getTitle() ?? "",
    loading: wc?.isLoading() ?? false,
    canGoBack: wc?.navigationHistory.canGoBack() ?? false,
    canGoForward: wc?.navigationHistory.canGoForward() ?? false,
  };
}

const send = (channel, payload) => host && !host.isDestroyed() && host.webContents.send(channel, payload);
const pushState = () => send("claude:state", state());

function applyBounds() {
  const v = current();
  if (v && bounds) v.setBounds(bounds);
}

function createView(profile) {
  const ses = session.fromPartition(`persist:claude-${profile}`);
  // UA Chrome biasa (tanpa token Electron/ARRR) supaya Claude.ai & login Google memperlakukannya seperti browser
  ses.setUserAgent(session.defaultSession.getUserAgent().replace(/\s?ARRRStudioDesktop\/\S+/, "").replace(/\s?Electron\/\S+/, ""));
  ses.setPermissionRequestHandler((_wc, permission, cb) => cb(ALLOWED_PERMISSIONS.has(permission)));
  ses.setPermissionCheckHandler((_wc, permission) => ALLOWED_PERMISSIONS.has(permission));

  const view = new WebContentsView({
    webPreferences: { session: ses, contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: true },
  });
  view.setBackgroundColor(COLORS[store.get("theme", "dark") === "light" ? "light" : "dark"].bg);
  const wc = view.webContents;

  wc.setWindowOpenHandler(({ url }) => {
    // Login Google/Apple = POPUP yang mengirim hasil ke jendela pembukanya lalu menutup diri → harus jadi popup
    // sungguhan (sesi profil ini ikut otomatis). Dimuat di view yang sama → hasil login hilang, balik ke halaman login.
    if (isAuthPopup(url)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width: 520,
          height: 720,
          parent: host && !host.isDestroyed() ? host : undefined,
          autoHideMenuBar: true,
          title: "Masuk ke Claude",
          backgroundColor: "#ffffff",
          webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
        },
      };
    }
    if (isInView(url)) wc.loadURL(url);
    else if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  // Popup login: tautan di dalamnya tetap di popup; selesai → popup ditutup oleh halaman login sendiri
  wc.on("did-create-window", (popup) => {
    popup.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/.test(url) && !isInView(url)) shell.openExternal(url);
      return { action: "deny" };
    });
  });
  wc.on("will-navigate", (e, url) => {
    if (isInView(url)) return;
    e.preventDefault();
    if (/^https?:/.test(url)) shell.openExternal(url);
  });
  wc.on("will-attach-webview", (e) => e.preventDefault());
  // Halaman memanggil window.close() (mis. selesai login OAuth) → webContents hancur. Buat ulang & tempel lagi
  // bila profil ini sedang tampil (sesi login tersimpan di disk, jadi tetap masuk).
  wc.once("destroyed", () => {
    if (views.get(profile) === view) views.delete(profile);
    if (shown && profile === active && host && !host.isDestroyed()) {
      setImmediate(() => {
        try {
          if (shown && profile === active && host && !host.isDestroyed()) attach(host);
        } catch (err) {
          console.warn("[claude] recreate", err?.message || err);
        }
      });
    }
  });
  // Proses halaman mati (crash / kehabisan memori) → muat ulang
  wc.on("render-process-gone", (_e, d) => {
    if (d.reason !== "clean-exit" && !wc.isDestroyed()) wc.reload();
  });
  for (const ev of ["did-navigate", "did-navigate-in-page", "page-title-updated", "did-start-loading", "did-stop-loading"]) {
    wc.on(ev, () => profile === active && pushState());
  }

  wc.on("context-menu", (_e, p) => {
    const items = [];
    if (p.isEditable) {
      items.push({ role: "cut", label: "Potong" }, { role: "copy", label: "Salin" }, { role: "paste", label: "Tempel" }, { type: "separator" });
    } else if (p.selectionText) {
      items.push({ role: "copy", label: "Salin" }, { type: "separator" });
    }
    if (p.linkURL) items.push({ label: "Salin link", click: () => clipboard.writeText(p.linkURL) }, { type: "separator" });
    if (p.mediaType === "image" && p.srcURL) items.push({ label: "Salin gambar", click: () => wc.copyImageAt(p.x, p.y) }, { type: "separator" });
    items.push(
      { label: "Kembali", enabled: wc.navigationHistory.canGoBack(), click: () => wc.navigationHistory.goBack() },
      { label: "Maju", enabled: wc.navigationHistory.canGoForward(), click: () => wc.navigationHistory.goForward() },
      { label: "Muat ulang", click: () => wc.reload() },
    );
    Menu.buildFromTemplate(items).popup({ window: host ?? undefined });
  });

  wc.loadURL(HOME);
  views.set(profile, view);
  return view;
}

/** Lepas view dari jendela tanpa melempar (view/jendela bisa sudah dihancurkan) */
function removeFrom(win, v) {
  try {
    if (win && !win.isDestroyed() && alive(v)) win.contentView.removeChildView(v);
  } catch {
    // sudah terlepas
  }
}

function attach(win) {
  if (host !== win) {
    for (const v of views.values()) removeFrom(host, v);
    host = win;
    win.on("closed", () => {
      if (host !== win) return;
      host = null;
      shown = false;
      // View ikut hancur bersama jendela → buang, dibuat ulang saat jendela baru dibuka
      for (const [n, v] of views) if (!alive(v)) views.delete(n);
    });
    win.on("resize", applyBounds);
  }
  for (const [n, v] of views) if (!alive(v)) views.delete(n);
  const view = current() ?? createView(active);
  // Hanya profil aktif yang ditempel; profil lain tetap hidup di latar (chat yang sedang berjalan tidak putus)
  for (const [n, v] of views) if (n !== active) removeFrom(win, v);
  win.contentView.addChildView(view);
  view.setVisible(true);
  shown = true;
  applyBounds();
  pushState();
}

function detach() {
  shown = false;
  for (const v of views.values()) removeFrom(host, v);
}

/** Area dari web (px CSS) → DIP jendela; ikut faktor zoom halaman */
function toDip(win, rect) {
  const z = win.webContents.getZoomFactor();
  return {
    x: Math.round(rect.x * z),
    y: Math.round(rect.y * z),
    width: Math.max(0, Math.round(rect.width * z)),
    height: Math.max(0, Math.round(rect.height * z)),
  };
}

// IPC hanya dari halaman web ARRR sendiri
const fromApp = (e) => {
  try {
    return isAppUrl(e.senderFrame.url);
  } catch {
    return false;
  }
};
// Galat di handler dicatat saja — jangan sampai jadi dialog "JavaScript error in the main process"
const on = (channel, fn) =>
  ipcMain.on(channel, (e, ...args) => {
    if (!fromApp(e)) return;
    try {
      fn(BrowserWindow.fromWebContents(e.sender), ...args);
    } catch (err) {
      console.warn(`[claude] ${channel}`, err?.message || err);
    }
  });
const handle = (channel, fn) =>
  ipcMain.handle(channel, async (e, ...args) => {
    if (!fromApp(e)) return null;
    try {
      return await fn(BrowserWindow.fromWebContents(e.sender), ...args);
    } catch (err) {
      console.warn(`[claude] ${channel}`, err?.message || err);
      return null;
    }
  });

on("claude:show", (win, rect) => {
  if (!win) return;
  bounds = toDip(win, rect);
  attach(win);
});
on("claude:bounds", (win, rect) => {
  if (!win) return;
  bounds = toDip(win, rect);
  applyBounds();
});
on("claude:hide", () => detach());
on("claude:profile", (win, n) => {
  const next = Math.min(PROFILES, Math.max(1, Number(n) || 1));
  if (next === active) return;
  active = next;
  store.set("claudeProfile", active);
  if (shown && win) attach(win);
  else pushState();
});
on("claude:nav", (_win, action) => {
  const wc = current()?.webContents;
  if (!wc) return;
  if (action === "back") wc.navigationHistory.goBack();
  else if (action === "forward") wc.navigationHistory.goForward();
  else if (action === "reload") wc.reload();
  else if (action === "new") wc.loadURL(HOME);
});
// Link login dari email (diklik di Gmail = login di browser biasa, bukan di app) → tempel di app, dibuka di profil aktif
handle("claude:open", (_win, url) => {
  if (!isClaudeLink(url)) return false;
  const v = current();
  if (!v) return false;
  v.webContents.loadURL(String(url).trim());
  return true;
});
// Popover/dialog web terbuka di atas area Claude → view disembunyikan sementara, diganti cuplikan gambar
handle("claude:freeze", async () => {
  const v = current();
  if (!v) return null;
  const img = await v.webContents.capturePage().catch(() => null);
  v.setVisible(false);
  return img && !img.isEmpty() ? img.toDataURL() : null;
});
on("claude:unfreeze", () => current()?.setVisible(true));
handle("claude:state", () => state());
// Keluar dari akun di profil ini (hapus cookie & data sesi) → kembali ke halaman login
handle("claude:signOut", async (_win, n) => {
  const profile = Math.min(PROFILES, Math.max(1, Number(n) || active));
  await session.fromPartition(`persist:claude-${profile}`).clearStorageData();
  const v = views.get(profile);
  if (alive(v)) v.webContents.loadURL(HOME);
  return state();
});

module.exports = {};
