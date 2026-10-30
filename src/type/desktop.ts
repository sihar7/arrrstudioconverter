/** Jembatan yang diekspos preload app desktop (desktop/src/preload.js) — hanya ada di dalam app */
export interface DesktopDownloadEvent {
  id: number;
  type: "started" | "progress" | "done" | "cancelled" | "failed";
  name?: string;
  received?: number;
  total?: number;
}

/** Cara menyimpan file di app desktop: dialog Simpan tiap kali, atau langsung ke folder pilihan */
export interface DesktopSaveSettings {
  mode: "ask" | "folder";
  folder: string;
  /** true = folder bawaan sistem (Downloads) */
  isDefault: boolean;
}

/** Status update app desktop (electron-updater) — v1.3+ */
export type DesktopUpdateEvent =
  | { type: "downloading"; version: string; percent: number; bps: number }
  | { type: "ready"; version: string }
  /** macOS tanpa sertifikat: tidak bisa pasang otomatis → unduh installer manual */
  | { type: "manual"; version: string }
  | { type: "none" | "error" };

export interface ArrDesktop {
  isDesktop: true;
  version: string;
  platform: string;
  onDownload: (cb: (e: DesktopDownloadEvent) => void) => () => void;
  showDownload: (id: number) => Promise<void>;
  openDownloadsFolder: () => Promise<void>;
  getDownloadsFolder: () => Promise<string>;
  chooseDownloadsFolder: () => Promise<string>;
  // ── v1.1+: title bar sendiri (opsional — app 1.0.0 masih memakai bingkai jendela bawaan) ──
  /** true = jendela tanpa title bar bawaan; web menggambar title bar + bottom bar sendiri */
  titleBar?: boolean;
  /** Warna tombol jendela Windows (overlay) mengikuti tema web */
  setTheme?: (theme: "dark" | "light") => void;
  /** Navigasi dari menu aplikasi / pintasan (Ctrl+1…) → router web, tanpa muat ulang halaman */
  onNavigate?: (cb: (path: string) => void) => () => void;
  getSaveSettings?: () => Promise<DesktopSaveSettings>;
  setSaveMode?: (mode: DesktopSaveSettings["mode"]) => Promise<DesktopSaveSettings>;
  resetDownloadsFolder?: () => Promise<DesktopSaveSettings>;
  // ── v1.3+: update app tampil sebagai kartu di halaman, bukan dialog sistem ──
  /** cb(event) tiap status update berubah; status terakhir langsung dikirim saat berlangganan → fungsi unsubscribe */
  onUpdate?: (cb: (e: DesktopUpdateEvent) => void) => () => void;
  /** Tutup app & pasang update yang sudah terunduh */
  installUpdate?: () => Promise<void>;
  /** Buka halaman download (macOS tanpa auto-install) */
  openUpdatePage?: () => Promise<void>;
}

declare global {
  interface Window {
    arrDesktop?: ArrDesktop;
  }
}

export const getDesktop = (): ArrDesktop | undefined => (typeof window === "undefined" ? undefined : window.arrDesktop);
