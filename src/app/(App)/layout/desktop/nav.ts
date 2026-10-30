import { SfArrowUpDoc, SfClock, SfCube, SfCutout, SfEnlarge, SfGear, SfPlayRect, SfSpoof, SfStack, SfWaveform } from "@/components/icons/SfIcons";
import type { NavItem } from "../header/Header";

// Menu app desktop (sidebar & command palette). Harga sengaja tidak ada di desktop (upgrade lewat kartu paket di akun).
export const D_CONVERTER: NavItem = { href: "/converter", key: "converter", icon: SfWaveform, tone: "pink" };
export const D_YOUTUBE: NavItem = { href: "/youtube", key: "youtube", icon: SfPlayRect, tone: "red" };
export const D_UPLOAD: NavItem = { href: "/upload", key: "upload", icon: SfArrowUpDoc, tone: "green" };
export const D_SPOOF: NavItem = { href: "/spoof", key: "spoof", icon: SfSpoof, tone: "orange" };
export const D_SKYBOX: NavItem = { href: "/skybox", key: "skybox", icon: SfCube, tone: "teal" };
export const D_REMOVE_BG: NavItem = { href: "/remove-bg", key: "removeBg", icon: SfCutout, tone: "indigo" };
export const D_UPSCALE: NavItem = { href: "/upscale", key: "upscale", icon: SfEnlarge, tone: "yellow" };
export const D_LIBRARY: NavItem = { href: "/library", key: "library", icon: SfStack, tone: "purple" };
export const D_HISTORY: NavItem = { href: "/history", key: "history", icon: SfClock, tone: "blue" };
export const D_SETTINGS: NavItem = { href: "/settings", key: "settings", icon: SfGear, tone: "gray" };

// Urutan = pintasan Ctrl/⌘+1… (desktop/src/config.js NAV_SHORTCUTS)
const SHORTCUTS = [D_CONVERTER, D_YOUTUBE, D_SKYBOX, D_REMOVE_BG, D_UPSCALE, D_LIBRARY, D_HISTORY].map((n) => n.href);
export const shortcutOf = (href: string) => {
  const i = SHORTCUTS.indexOf(href);
  return i < 0 ? undefined : i + 1;
};

export interface NavSection {
  id: "studio" | "images" | "shelf";
  items: NavItem[];
}

/** Bagian sidebar; Upload audio, Spoof, Skybox & alat gambar khusus member */
export function navSections(member: boolean): NavSection[] {
  return [
    { id: "studio", items: [D_CONVERTER, D_YOUTUBE, ...(member ? [D_UPLOAD, D_SPOOF, D_SKYBOX] : [])] },
    ...(member ? [{ id: "images" as const, items: [D_REMOVE_BG, D_UPSCALE] }] : []),
    { id: "shelf", items: [D_LIBRARY, D_HISTORY] },
  ];
}

/** Event untuk halaman YouTube yang sudah terbuka: cari kata kunci tanpa navigasi ulang (command palette) */
export const YT_SEARCH_EVENT = "arrc:yt-search";

export const isMac = () => typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
