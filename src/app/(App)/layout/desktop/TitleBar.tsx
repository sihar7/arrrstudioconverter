"use client";

import { useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NavArrowLeft, NavArrowRight } from "iconoir-react";
import { LangToggle, ThemeToggle } from "@/components/shared/PrefToggles";
import { useScrolled } from "@/hooks/useScrollState";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";

// Judul halaman di toolbar (kunci t.nav)
const TITLES: Record<string, string> = {
  "/converter": "converter",
  "/library": "library",
  "/history": "history",
  "/upload": "upload",
  "/skybox": "skybox",
  "/youtube": "youtube",
  "/remove-bg": "removeBg",
  "/upscale": "upscale",
  "/settings": "settings",
  "/pricing": "pricing",
  "/obfuscator": "obfuscator",
  "/download": "downloadApp",
};

// Navigation API Chromium: tahu apakah ada halaman sebelum/sesudah (tombol nonaktif bila tidak)
type HistoryNav = EventTarget & { canGoBack: boolean; canGoForward: boolean };
const historyNav = () => (window as Window & { navigation?: HistoryNav }).navigation;
// Ditunda ke microtask: Next memanggil pushState di dalam useInsertionEffect, dan update store di sana
// memicu error "useInsertionEffect must not schedule updates"
const subscribe = (cb: () => void) => {
  const nav = historyNav();
  const onChange = () => queueMicrotask(cb);
  nav?.addEventListener("currententrychange", onChange);
  return () => nav?.removeEventListener("currententrychange", onChange);
};

/**
 * Toolbar di atas area kerja (kanan sidebar) — seluruh bar = area seret jendela.
 * Kiri: kembali/maju · judul halaman yang baru muncul setelah judul besar di konten terlewati (large title
 * macOS) · kanan: bahasa & tema · ruang tombol jendela Windows (--caption-w). Latar kaca + garis hanya saat discroll.
 */
export default function TitleBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useT();
  const scrolled = useScrolled(4);
  const pastTitle = useScrolled(84);
  const canBack = useSyncExternalStore(subscribe, () => historyNav()?.canGoBack ?? true, () => false);
  const canForward = useSyncExternalStore(subscribe, () => historyNav()?.canGoForward ?? true, () => false);
  const titleKey = Object.entries(TITLES).find(([href]) => pathname.startsWith(href))?.[1];

  const navBtn =
    "grid size-8 cursor-pointer place-items-center rounded-[8px] text-fg-2 transition-colors hover:bg-fg/[0.07] hover:text-fg active:scale-95 disabled:pointer-events-none disabled:opacity-30";

  return (
    <header
      className={cn(
        "app-drag fixed right-0 top-0 z-40 flex h-[var(--bar-h)] items-center gap-3 border-b pl-4 pr-[calc(var(--caption-w)+10px)] transition-[background-color,border-color,left] duration-[var(--spring-dur)] ease-[var(--spring)] left-[var(--side-w)]",
        scrolled ? "border-[var(--hairline)] bg-[var(--glass)] backdrop-blur-xl backdrop-saturate-150" : "border-transparent bg-bg",
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-[70] focus:rounded-s focus:bg-fg focus:px-4 focus:py-2 focus:text-bg"
      >
        {t.common.skip}
      </a>
      <div className="flex items-center gap-0.5">
        <button type="button" className={navBtn} onClick={() => router.back()} disabled={!canBack} aria-label={t.desktop.back} title={t.desktop.back}>
          <NavArrowLeft width={18} height={18} strokeWidth={2} />
        </button>
        <button type="button" className={navBtn} onClick={() => router.forward()} disabled={!canForward} aria-label={t.desktop.forward} title={t.desktop.forward}>
          <NavArrowRight width={18} height={18} strokeWidth={2} />
        </button>
      </div>
      <p
        aria-hidden={!pastTitle}
        className={cn(
          "min-w-0 flex-1 truncate text-[14px] font-semibold tracking-[-0.01em] transition-[opacity,translate] duration-300 ease-[var(--ease)]",
          pastTitle && titleKey ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
        )}
      >
        {titleKey ? (t.nav[titleKey as keyof typeof t.nav] as string) : " "}
      </p>
      <div className="flex items-center gap-1">
        <LangToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
