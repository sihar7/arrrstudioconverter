// Menu aplikasi + menu klik kanan (salin/tempel link YouTube harus jalan di input)
const { app, clipboard, Menu, shell } = require("electron");
const { APP_URL } = require("./config");
const downloads = require("./downloads");
const updater = require("./updater");

const isMac = process.platform === "darwin";

function buildAppMenu(getWindow) {
  const go = (p) => getWindow()?.loadURL(`${APP_URL}${p}`);
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about", label: `Tentang ${app.name}` },
              { label: "Cek update…", click: () => updater.check(true) },
              { type: "separator" },
              { role: "hide", label: "Sembunyikan" },
              { role: "hideOthers", label: "Sembunyikan lainnya" },
              { role: "unhide", label: "Tampilkan semua" },
              { type: "separator" },
              { role: "quit", label: "Keluar" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        { label: "Converter", accelerator: "CmdOrCtrl+1", click: () => go("/converter") },
        { label: "Audio saya", accelerator: "CmdOrCtrl+2", click: () => go("/library") },
        { label: "Riwayat", accelerator: "CmdOrCtrl+3", click: () => go("/history") },
        { label: "Pengaturan", accelerator: "CmdOrCtrl+,", click: () => go("/settings") },
        { type: "separator" },
        { label: "Buka folder download", accelerator: "CmdOrCtrl+Shift+D", click: () => shell.openPath(downloads.downloadDir()) },
        { label: "Ganti folder download…", click: () => downloads.chooseFolder(getWindow()) },
        { type: "separator" },
        isMac ? { role: "close", label: "Tutup jendela" } : { role: "quit", label: "Keluar" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo", label: "Urungkan" },
        { role: "redo", label: "Ulangi" },
        { type: "separator" },
        { role: "cut", label: "Potong" },
        { role: "copy", label: "Salin" },
        { role: "paste", label: "Tempel" },
        { role: "selectAll", label: "Pilih semua" },
      ],
    },
    {
      label: "Tampilan",
      submenu: [
        { role: "reload", label: "Muat ulang" },
        { label: "Kembali", accelerator: isMac ? "Cmd+[" : "Alt+Left", click: () => getWindow()?.webContents.navigationHistory.goBack() },
        { label: "Maju", accelerator: isMac ? "Cmd+]" : "Alt+Right", click: () => getWindow()?.webContents.navigationHistory.goForward() },
        { type: "separator" },
        { role: "resetZoom", label: "Ukuran asli" },
        { role: "zoomIn", label: "Perbesar" },
        { role: "zoomOut", label: "Perkecil" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Layar penuh" },
        ...(app.isPackaged ? [] : [{ role: "toggleDevTools" }]),
      ],
    },
    { role: "windowMenu", label: "Jendela" },
    {
      role: "help",
      label: "Bantuan",
      submenu: [
        ...(isMac ? [] : [{ label: "Cek update…", click: () => updater.check(true) }, { type: "separator" }]),
        { label: "Website ARRR Studio", click: () => shell.openExternal("https://arrstudioweb.vercel.app/en") },
        { label: "Discord", click: () => shell.openExternal("https://discord.gg/mtn3YmwjV") },
        { type: "separator" },
        { label: `Versi ${app.getVersion()}`, enabled: false },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function attachContextMenu(win) {
  win.webContents.on("context-menu", (_e, p) => {
    const items = [];
    if (p.linkURL && /^https?:/.test(p.linkURL)) {
      items.push({ label: "Buka di browser", click: () => shell.openExternal(p.linkURL) });
      items.push({ label: "Salin alamat tautan", click: () => clipboard.writeText(p.linkURL) });
      items.push({ type: "separator" });
    }
    if (p.isEditable) {
      items.push(
        { role: "cut", label: "Potong", enabled: p.editFlags.canCut },
        { role: "copy", label: "Salin", enabled: p.editFlags.canCopy },
        { role: "paste", label: "Tempel", enabled: p.editFlags.canPaste },
        { type: "separator" },
        { role: "selectAll", label: "Pilih semua" },
      );
    } else if (p.selectionText) {
      items.push({ role: "copy", label: "Salin" });
    }
    if (items.length) Menu.buildFromTemplate(items).popup({ window: win });
  });
}

module.exports = { buildAppMenu, attachContextMenu };
