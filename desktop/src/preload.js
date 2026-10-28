// Jembatan aman web ↔ app (contextIsolation + sandbox). Hanya diekspos ke halaman ARRR sendiri.
const { contextBridge, ipcRenderer } = require("electron");

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? "";
const origin = arg("arrr-origin");
const base = arg("arrr-base");

// Hanya web ARRR (di bawah basePath), bukan situs lain di domain yang sama
if (origin && location.origin === origin && (!base || location.pathname === base || location.pathname.startsWith(`${base}/`))) {
  // Navigasi dari menu aplikasi: diteruskan ke router web kalau sudah terdaftar, kalau belum muat halaman biasa
  let navHandler = null;
  ipcRenderer.on("app:navigate", (_e, path) => (navHandler ? navHandler(path) : location.assign(`${base}${path}`)));

  contextBridge.exposeInMainWorld("arrDesktop", {
    isDesktop: true,
    version: arg("arrr-version"),
    platform: process.platform,
    /** Jendela tanpa title bar bawaan → web menggambar title bar + sidebar sendiri */
    titleBar: true,
    /** Tema web aktif → warna tombol jendela (overlay Windows) & latar jendela */
    setTheme: (theme) => ipcRenderer.send("window:theme", theme),
    /** cb(path) dipanggil saat menu aplikasi meminta pindah halaman → fungsi unsubscribe */
    onNavigate(cb) {
      navHandler = cb;
      return () => {
        if (navHandler === cb) navHandler = null;
      };
    },
    /** cb({ id, type: started|progress|done|cancelled|failed, name?, received?, total? }) → fungsi unsubscribe */
    onDownload(cb) {
      const listener = (_e, payload) => cb(payload);
      ipcRenderer.on("download:event", listener);
      return () => ipcRenderer.removeListener("download:event", listener);
    },
    showDownload: (id) => ipcRenderer.invoke("download:show", id),
    openDownloadsFolder: () => ipcRenderer.invoke("download:openFolder"),
    getDownloadsFolder: () => ipcRenderer.invoke("download:getFolder"),
    chooseDownloadsFolder: () => ipcRenderer.invoke("download:chooseFolder"),
    /** { mode: "ask" | "folder", folder, isDefault } */
    getSaveSettings: () => ipcRenderer.invoke("download:getSettings"),
    setSaveMode: (mode) => ipcRenderer.invoke("download:setMode", mode),
    resetDownloadsFolder: () => ipcRenderer.invoke("download:resetFolder"),
    /** cb({ type: downloading|ready|manual|none|error, version?, percent?, bps? }) — status terakhir langsung dikirim → fungsi unsubscribe */
    onUpdate(cb) {
      const listener = (_e, payload) => cb(payload);
      ipcRenderer.on("update:event", listener);
      ipcRenderer.invoke("update:subscribe").then((last) => last && cb(last), () => {});
      return () => ipcRenderer.removeListener("update:event", listener);
    },
    installUpdate: () => ipcRenderer.invoke("update:install"),
    /** Mode Alice (admin): isi memori Claude Code di PC ini → [{ path, text }] */
    readClaudeMemory: () => ipcRenderer.invoke("memory:readClaude"),
    /** Mode Alice (admin): Claude.ai asli di atas area kerja, 3 profil akun (langganan user sendiri) */
    claude: {
      show: (rect) => ipcRenderer.send("claude:show", rect),
      setBounds: (rect) => ipcRenderer.send("claude:bounds", rect),
      hide: () => ipcRenderer.send("claude:hide"),
      setProfile: (n) => ipcRenderer.send("claude:profile", n),
      nav: (action) => ipcRenderer.send("claude:nav", action),
      freeze: () => ipcRenderer.invoke("claude:freeze"),
      unfreeze: () => ipcRenderer.send("claude:unfreeze"),
      getState: () => ipcRenderer.invoke("claude:state"),
      signOut: (n) => ipcRenderer.invoke("claude:signOut", n),
      onState(cb) {
        const listener = (_e, s) => cb(s);
        ipcRenderer.on("claude:state", listener);
        return () => ipcRenderer.removeListener("claude:state", listener);
      },
    },
    /** Mode Alice (admin): Roblox Studio lewat StudioMCP lokal */
    studio: {
      status: () => ipcRenderer.invoke("studio:status"),
      listTools: () => ipcRenderer.invoke("studio:listTools"),
      call: (name, args) => ipcRenderer.invoke("studio:call", name, args),
      stop: () => ipcRenderer.invoke("studio:stop"),
    },
    openUpdatePage: () => ipcRenderer.invoke("update:openPage"),
    /** VPN rumah (akun admin): { state: off|connecting|online|logged-out|not-admin|error, streams, mbIn, mbOut, server } */
    vpnStatus: () => ipcRenderer.invoke("vpn:status"),
    /** cb(status) saat status VPN rumah berubah → fungsi unsubscribe */
    onVpn(cb) {
      const listener = (_e, payload) => cb(payload);
      ipcRenderer.on("vpn:event", listener);
      return () => ipcRenderer.removeListener("vpn:event", listener);
    },
  });
}
