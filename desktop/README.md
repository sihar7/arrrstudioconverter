# ARRR Studio Converter — Desktop

App desktop (Electron) untuk **Windows** & **macOS**. Membuka web produksi
(`https://bypass.arrrstudio.com`) di jendela sendiri, plus fitur native:

- Download langsung ke folder (default: Downloads; ganti lewat **File → Ganti folder download…**)
- Progres download di taskbar / dock, notifikasi saat selesai, toast di halaman
- Menu klik kanan (salin / tempel link YouTube), pintasan `Ctrl/Cmd+1..3`, `Ctrl/Cmd+,`
- Login Discord di dalam app; tautan lain dibuka di browser default
- Update otomatis dari GitHub Releases (Windows: pasang di latar · macOS tanpa sertifikat: diberi tahu lalu buka halaman download)
- Halaman offline dengan tombol coba lagi

## Struktur

```
desktop/
  build/                ikon app (icon.ico Windows, icon.icns/icon.png macOS) + logo-source.png
  src/main.js           jendela, navigasi aman, sesi, offline
  src/downloads.js      will-download → simpan ke folder, progres, notifikasi, IPC
  src/updater.js        electron-updater (GitHub Releases)
  src/menu.js           menu aplikasi & klik kanan
  src/preload.js        window.arrDesktop (hanya untuk origin web ARRR)
  src/offline.html      layar tidak ada koneksi
  electron-builder.yml  target NSIS (Windows) & DMG+ZIP universal (macOS)
```

## Jalankan & build

```bash
cd desktop
npm install
npm start            # buka web produksi
npm run dev          # buka web lokal http://localhost:3000
npm run dist:win     # → dist/ARRR-Studio-Converter-Setup.exe
npm run dist:mac     # → dist/ARRR-Studio-Converter-mac.dmg (harus di macOS)
```

> Kalau `electron` jalan seperti Node biasa ("bad option"), hapus env `ELECTRON_RUN_AS_NODE`.

## Rilis (Windows + Mac sekaligus)

1. Naikkan `version` di `desktop/package.json` (mis. `1.0.1`), commit.
2. `git tag desktop-v1.0.1 && git push origin desktop-v1.0.1`
3. Workflow **Desktop Release** membangun di runner Windows & macOS lalu menerbitkan rilis `v1.0.1`.
   Halaman `/download` di web memakai `releases/latest/download/…` → otomatis menunjuk versi terbaru.

Tanda tangan kode (opsional, menghilangkan peringatan SmartScreen / Gatekeeper):
secret `CSC_LINK` + `CSC_KEY_PASSWORD`, untuk notarize macOS juga `APPLE_ID`,
`APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` (lalu set `notarize: true` di `electron-builder.yml`).
Tanpa sertifikat, macOS ditandatangani ad-hoc dan auto-update di Mac hanya berupa pemberitahuan.

## Keamanan

`contextIsolation` + `sandbox` aktif, `nodeIntegration` mati. Jembatan `window.arrDesktop` hanya diekspos
ke origin web ARRR dan IPC menolak frame dari origin lain. Izin browser dibatasi (clipboard, notifikasi,
fullscreen). Webview & jendela baru ditolak; host di luar web ARRR + discord.com dibuka di browser default.
