/** Jembatan yang diekspos preload app desktop (desktop/src/preload.js) — hanya ada di dalam app */
export interface DesktopDownloadEvent {
  id: number;
  type: "started" | "progress" | "done" | "cancelled" | "failed";
  name?: string;
  received?: number;
  total?: number;
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
}

declare global {
  interface Window {
    arrDesktop?: ArrDesktop;
  }
}

export const getDesktop = (): ArrDesktop | undefined => (typeof window === "undefined" ? undefined : window.arrDesktop);
