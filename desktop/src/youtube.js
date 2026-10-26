// YouTube asli di dalam app: WebContentsView (bukan iframe) di atas area halaman /youtube web ARRR.
// Sesi terpisah & tersimpan (persist:youtube) → login YouTube, histori, rekomendasi tetap ada. Tanpa preload
// (YouTube tidak bisa mengakses bridge ARRR). Video bisa dikirim ke antrean Converter lewat tombol di toolbar
// web atau klik kanan pada video mana pun.
const { BrowserWindow, clipboard, ipcMain, Menu, session, shell, WebContentsView } = require("electron");
const { APP_ORIGIN, COLORS } = require("./config");
const store = require("./store");

const HOME = "https://www.youtube.com/";
// Host yang boleh dibuka di dalam view (YouTube + login Google); selain itu ke browser default
const IN_VIEW = /(^|\.)(youtube\.com|youtu\.be|google\.com|googleusercontent\.com|gstatic\.com|ytimg\.com)$/i;

let view = null;
let host = null; // BrowserWindow tempat view ditempel
let bounds = null; // area terakhir dari web (DIP)
let fullscreen = false;

const isInView = (url) => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && IN_VIEW.test(u.hostname);
  } catch {
    return false;
  }
};

/** Link video apa pun (watch, shorts, youtu.be, music, embed, live) → URL watch kanonik; selain video → null */
function videoUrl(url) {
  try {
    const u = new URL(url);
    if (!/(^|\.)(youtube\.com|youtu\.be)$/i.test(u.hostname)) return null;
    let id = null;
    if (/youtu\.be$/i.test(u.hostname)) id = u.pathname.slice(1).split("/")[0];
    else if (u.pathname === "/watch") id = u.searchParams.get("v");
    else id = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1] ?? null;
    return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube.com/watch?v=${id}` : null;
  } catch {
    return null;
  }
}

function state() {
  if (!view) return null;
  const wc = view.webContents;
  const url = wc.getURL();
  return {
    url,
    title: wc.getTitle().replace(/\s*-\s*YouTube$/, ""),
    loading: wc.isLoading(),
    canGoBack: wc.navigationHistory.canGoBack(),
    canGoForward: wc.navigationHistory.canGoForward(),
    video: videoUrl(url),
  };
}

const sendToApp = (channel, payload) => host && !host.isDestroyed() && host.webContents.send(channel, payload);
const pushState = () => sendToApp("yt:state", state());

/** Kirim video ke antrean Converter (web yang menambahkan & memberi notifikasi) */
const addToQueue = (url) => sendToApp("yt:add", { url });

function applyBounds() {
  if (!view || !host || host.isDestroyed()) return;
  if (fullscreen) {
    const [width, height] = host.getContentSize();
    view.setBounds({ x: 0, y: 0, width, height });
  } else if (bounds) {
    view.setBounds(bounds);
  }
}

function ensureView() {
  if (view) return view;
  const ses = session.fromPartition("persist:youtube");
  // UA Chrome biasa (tanpa token Electron/ARRR) supaya YouTube & login Google memperlakukannya seperti browser
  ses.setUserAgent(session.defaultSession.getUserAgent().replace(/\s?ARRRStudioDesktop\/\S+/, ""));
  ses.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === "fullscreen" || permission === "clipboard-sanitized-write"));

  view = new WebContentsView({
    webPreferences: { session: ses, contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false },
  });
  view.setBackgroundColor(COLORS[store.get("theme", "dark") === "light" ? "light" : "dark"].bg);
  const wc = view.webContents;

  wc.setWindowOpenHandler(({ url }) => {
    if (isInView(url)) wc.loadURL(url);
    else if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  wc.on("will-navigate", (e, url) => {
    if (isInView(url)) return;
    e.preventDefault();
    if (/^https?:/.test(url)) shell.openExternal(url);
  });
  wc.on("will-attach-webview", (e) => e.preventDefault());
  for (const ev of ["did-navigate", "did-navigate-in-page", "page-title-updated", "did-start-loading", "did-stop-loading"]) wc.on(ev, pushState);

  // Layar penuh video: view menutupi seluruh jendela, kembali ke area semula saat keluar
  wc.on("enter-html-full-screen", () => {
    fullscreen = true;
    host?.setFullScreen(true);
    applyBounds();
  });
  wc.on("leave-html-full-screen", () => {
    fullscreen = false;
    host?.setFullScreen(false);
    applyBounds();
  });

  wc.on("context-menu", (_e, p) => {
    const linkVideo = videoUrl(p.linkURL || "");
    const pageVideo = videoUrl(wc.getURL());
    const items = [];
    if (linkVideo) items.push({ label: "Tambah ke antrean Converter", click: () => addToQueue(linkVideo) });
    else if (pageVideo && !p.isEditable) items.push({ label: "Tambah video ini ke antrean Converter", click: () => addToQueue(pageVideo) });
    if (p.linkURL) items.push({ label: "Salin link", click: () => clipboard.writeText(linkVideo || p.linkURL) });
    if (items.length) items.push({ type: "separator" });
    if (p.isEditable) {
      items.push({ role: "cut", label: "Potong" }, { role: "copy", label: "Salin" }, { role: "paste", label: "Tempel" }, { type: "separator" });
    } else if (p.selectionText) {
      items.push({ role: "copy", label: "Salin" }, { type: "separator" });
    }
    items.push(
      { label: "Kembali", enabled: wc.navigationHistory.canGoBack(), click: () => wc.navigationHistory.goBack() },
      { label: "Maju", enabled: wc.navigationHistory.canGoForward(), click: () => wc.navigationHistory.goForward() },
      { label: "Muat ulang", click: () => wc.reload() },
    );
    Menu.buildFromTemplate(items).popup({ window: host ?? undefined });
  });

  wc.loadURL(HOME);
  return view;
}

function attach(win) {
  ensureView();
  if (host !== win) {
    if (host && !host.isDestroyed()) host.contentView.removeChildView(view);
    host = win;
    win.on("closed", () => {
      if (host === win) host = null;
    });
    win.on("resize", applyBounds);
  }
  win.contentView.addChildView(view);
  view.setVisible(true);
  applyBounds();
  pushState();
}

function detach(pause) {
  if (!view || !host || host.isDestroyed()) return;
  if (pause) view.webContents.executeJavaScript("document.querySelectorAll('video').forEach((v) => v.pause())", true).catch(() => {});
  host.contentView.removeChildView(view);
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
    return new URL(e.senderFrame.url).origin === APP_ORIGIN;
  } catch {
    return false;
  }
};
const on = (channel, fn) => ipcMain.on(channel, (e, ...args) => fromApp(e) && fn(BrowserWindow.fromWebContents(e.sender), ...args));
const handle = (channel, fn) => ipcMain.handle(channel, (e, ...args) => (fromApp(e) ? fn(BrowserWindow.fromWebContents(e.sender), ...args) : null));

on("yt:show", (win, rect) => {
  if (!win) return;
  bounds = toDip(win, rect);
  attach(win);
});
on("yt:bounds", (win, rect) => {
  if (!win) return;
  bounds = toDip(win, rect);
  applyBounds();
});
on("yt:hide", (_win, pause) => detach(Boolean(pause)));
on("yt:nav", (_win, action) => {
  const wc = view?.webContents;
  if (!wc) return;
  if (action === "back") wc.navigationHistory.goBack();
  else if (action === "forward") wc.navigationHistory.goForward();
  else if (action === "reload") wc.reload();
  else if (action === "stop") wc.stop();
  else if (action === "home") wc.loadURL(HOME);
});
// Popover/dialog web terbuka di atas area YouTube → view disembunyikan sementara, diganti cuplikan gambar
handle("yt:freeze", async () => {
  if (!view) return null;
  const img = await view.webContents.capturePage().catch(() => null);
  view.setVisible(false);
  return img && !img.isEmpty() ? img.toDataURL() : null;
});
on("yt:unfreeze", () => view?.setVisible(true));
handle("yt:state", () => state());

module.exports = { videoUrl };
