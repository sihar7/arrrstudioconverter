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

/** Keadaan YouTube di dalam app (desktop/src/youtube.js) */
export interface YoutubeState {
  url: string;
  title: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  /** URL watch kanonik bila halaman sekarang adalah video; selain itu null */
  video: string | null;
}

/** Area halaman (px CSS, relatif jendela) tempat view YouTube native digambar */
export interface ViewRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DesktopYoutube {
  show: (rect: ViewRect) => void;
  setBounds: (rect: ViewRect) => void;
  /** pause = hentikan video yang sedang diputar */
  hide: (pause: boolean) => void;
  nav: (action: "back" | "forward" | "reload" | "stop" | "home") => void;
  /** Sembunyikan sementara (popover web terbuka di atasnya) → cuplikan gambar (data URL) */
  freeze: () => Promise<string | null>;
  unfreeze: () => void;
  getState: () => Promise<YoutubeState | null>;
  onState: (cb: (s: YoutubeState | null) => void) => () => void;
  onAdd: (cb: (p: { url: string }) => void) => () => void;
}

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
  youtube?: DesktopYoutube;
}

declare global {
  interface Window {
    arrDesktop?: ArrDesktop;
  }
}

export const getDesktop = (): ArrDesktop | undefined => (typeof window === "undefined" ? undefined : window.arrDesktop);
