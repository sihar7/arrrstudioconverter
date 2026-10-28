// Ikon tray untuk VPN rumah: selama VPN aktif (akun admin), menutup jendela hanya menyembunyikannya → app tetap
// jalan di latar dan convert YouTube di web & desktop tetap lolos. Bisa juga mulai otomatis saat komputer menyala
// (tersembunyi, langsung menyambung VPN).
const path = require("node:path");
const { app, Menu, Notification, Tray, nativeImage } = require("electron");
const store = require("./store");

const STATE_LABEL = {
  off: "Mati",
  connecting: "Menyambung…",
  online: "Tersambung — melayani server",
  "logged-out": "Belum masuk",
  "not-admin": "Khusus akun admin",
  error: "Terputus — mencoba lagi",
};

const HIDDEN_ARG = "--hidden";
/** App dibuka otomatis saat komputer menyala (tanpa jendela) */
const startedHidden = () => process.argv.includes(HIDDEN_ARG);

/** Tetap jalan di latar saat jendela ditutup (bawaan: ya) */
const background = () => store.get("vpn.background", true) !== false;

function loginItem(on) {
  // Saat dev (electron .) path app harus ikut, kalau tidak yang terbuka Electron kosong
  const args = app.isPackaged ? [HIDDEN_ARG] : [app.getAppPath(), HIDDEN_ARG];
  app.setLoginItemSettings({ openAtLogin: on, path: process.execPath, args });
}
const autoStart = () => app.getLoginItemSettings({ path: process.execPath, args: app.isPackaged ? [HIDDEN_ARG] : [app.getAppPath(), HIDDEN_ARG] }).openAtLogin;

/**
 * @param {{ showWindow: () => void, quit: () => void, vpn: { status: () => any } }} o
 */
function createTray({ showWindow, quit, vpn }) {
  let tray = null;
  let hinted = false;

  const menu = () => {
    const st = vpn.status();
    return Menu.buildFromTemplate(
      [
        { label: "ARRR Studio Converter", enabled: false },
        { label: `VPN rumah: ${STATE_LABEL[st.state] ?? st.state}`, enabled: false },
        st.state === "online" ? { label: `${st.streams} koneksi · ${st.mbIn} MB dari YouTube`, enabled: false } : null,
        { type: "separator" },
        { label: "Buka ARRR Studio", click: showWindow },
        {
          label: "Tetap jalan di latar saat jendela ditutup",
          type: "checkbox",
          checked: background(),
          click: (item) => store.set("vpn.background", item.checked),
        },
        {
          label: "Jalankan saat komputer menyala",
          type: "checkbox",
          checked: autoStart(),
          enabled: app.isPackaged || process.platform !== "darwin",
          click: (item) => loginItem(item.checked),
        },
        { type: "separator" },
        { label: "Keluar", click: quit },
      ].filter(Boolean),
    );
  };

  function ensure() {
    if (tray) return;
    const icon = nativeImage.createFromPath(path.join(__dirname, "assets", "tray.png")).resize({ width: 16, height: 16 });
    tray = new Tray(icon);
    tray.setToolTip("ARRR Studio Converter");
    // Windows: klik kiri = buka jendela, klik kanan = menu · macOS: klik = menu
    tray.on("click", () => (process.platform === "darwin" ? tray.popUpContextMenu(menu()) : showWindow()));
    tray.on("right-click", () => tray.popUpContextMenu(menu()));
    // Pertama kali jadi pintu keluar (admin) di app terpasang → mulai otomatis saat komputer menyala
    if (app.isPackaged && !store.get("vpn.autoStartSet", false)) {
      store.set("vpn.autoStartSet", true);
      loginItem(true);
    }
  }

  return {
    /** Status VPN berubah → tray muncul begitu VPN pernah tersambung (berarti akun admin) */
    update(st) {
      if (st.state === "online") ensure();
      tray?.setToolTip(`ARRR Studio Converter — VPN rumah: ${STATE_LABEL[st.state] ?? st.state}`);
    },
    /** Jendela ditutup: sembunyikan saja (VPN tetap jalan)? */
    keepAlive: () => Boolean(tray) && background(),
    /** Beri tahu sekali bahwa app masih jalan di latar */
    hintOnce() {
      if (hinted || store.get("vpn.hinted", false)) return;
      hinted = true;
      store.set("vpn.hinted", true);
      if (Notification.isSupported()) {
        new Notification({
          title: "ARRR Studio tetap jalan di latar",
          body: "VPN rumah aktif supaya convert YouTube tetap lolos. Atur atau keluar lewat ikon di tray.",
        }).show();
      }
    },
  };
}

module.exports = { createTray, startedHidden };
