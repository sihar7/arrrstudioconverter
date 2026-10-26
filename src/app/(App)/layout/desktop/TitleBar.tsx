"use client";

import { useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NavArrowLeft, NavArrowRight } from "iconoir-react";
import UserMenu from "@/components/shared/UserMenu";
import { LogoMark } from "@/components/shared/Logo";
import { LangToggle, ThemeToggle } from "@/components/shared/PrefToggles";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";

// Judul halaman di title bar (kunci t.nav)
const TITLES: Record<string, string> = {
  "/converter": "converter",
  "/library": "library",
  "/history": "history",
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
 * Title bar sendiri (jendela tanpa bingkai bawaan): seluruh bar = area seret jendela.
 * Kiri: logo (Windows; di macOS tempat tombol lampu lalu lintas) · kembali/maju + judul halaman ·
 * kanan: bahasa, tema, akun · paling kanan dikosongkan untuk tombol jendela Windows (--caption-w).
 */
export default function TitleBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useT();
  const canBack = useSyncExternalStore(subscribe, () => historyNav()?.canGoBack ?? true, () => false);
  const canForward = useSyncExternalStore(subscribe, () => historyNav()?.canGoForward ?? true, () => false);
  const titleKey = Object.entries(TITLES).find(([href]) => pathname.startsWith(href))?.[1];

  const navBtn =
    "grid size-8 cursor-pointer place-items-center rounded-xs text-fg-2 transition-colors hover:bg-fg/[0.07] hover:text-fg active:scale-95 disabled:pointer-events-none disabled:opacity-35";

  return (
    <header className="app-drag fixed inset-x-0 top-0 z-50 flex h-[var(--bar-h)] items-center gap-3 border-b border-line/60 bg-bg pl-4 pr-[calc(var(--caption-w)+8px)] mac:pl-[84px]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-[70] focus:rounded-s focus:bg-fg focus:px-4 focus:py-2 focus:text-bg"
      >
        {t.common.skip}
      </a>
      <span className="flex items-center gap-2.5 pr-2 mac:hidden">
        <LogoMark size={28} priority />
        <span className="whitespace-nowrap text-[11px] font-bold tracking-[0.22em] max-[759px]:hidden">ARRR STUDIO</span>
      </span>
      <div className="flex items-center gap-0.5">
        <button type="button" className={navBtn} onClick={() => router.back()} disabled={!canBack} aria-label={t.desktop.back} title={t.desktop.back}>
          <NavArrowLeft width={18} height={18} strokeWidth={2} />
        </button>
        <button type="button" className={navBtn} onClick={() => router.forward()} disabled={!canForward} aria-label={t.desktop.forward} title={t.desktop.forward}>
          <NavArrowRight width={18} height={18} strokeWidth={2} />
        </button>
      </div>
      <p className={cn("min-w-0 flex-1 truncate text-[14px] font-semibold tracking-[-0.01em]", !titleKey && "invisible")}>
        {titleKey ? (t.nav[titleKey as keyof typeof t.nav] as string) : " "}
      </p>
      <div className="flex items-center gap-1">
        <LangToggle />
        <ThemeToggle />
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />
        <UserMenu />
      </div>
    </header>
  );
}
