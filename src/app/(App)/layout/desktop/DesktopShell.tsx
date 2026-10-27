"use client";

import dynamic from "next/dynamic";
import { useHydrated } from "@/hooks/useHydrated";
import { getDesktop } from "@/type/desktop";

// Sidebar, toolbar & transport bar hanya diunduh di app desktop — pengunjung web tidak membayar JS-nya
const DesktopChrome = dynamic(() => import("./DesktopChrome"), { ssr: false });

/**
 * Kulit aplikasi desktop (Electron) bergaya studio audio: sidebar kiri · toolbar di atas area kerja ·
 * transport bar di dasar, menggantikan navbar/tab bar/footer web. Kerangka polos di bawah ini ikut SSR dan
 * baru terlihat lewat varian `desk:` (atribut dipasang skrip head sebelum paint) → tempatnya sudah terpesan
 * sebelum JS jalan, tanpa kedip navbar web. Penanda CSS: `desk-own-bar` = halaman menggambar title bar sendiri
 * (selain itu, mis. admin, dapat title bar polos) · `desk-shell` = ada transport bar (jalur scrollbar berhenti di atasnya).
 */
export default function DesktopShell() {
  const hydrated = useHydrated();
  return (
    <>
      <div aria-hidden="true" className="desk-shell desk-own-bar side-glass fixed inset-y-0 left-0 z-40 hidden w-[var(--side-w)] border-r border-[var(--hairline)] desk:block" />
      <div aria-hidden="true" className="app-drag fixed right-0 top-0 z-30 hidden h-[var(--bar-h)] bg-bg left-[var(--side-w)] desk:block" />
      <div aria-hidden="true" className="fixed bottom-0 right-0 z-30 hidden h-[var(--dock-h)] border-t border-[var(--hairline)] bg-[var(--glass)] left-[var(--side-w)] desk:block" />
      {hydrated && getDesktop() && <DesktopChrome />}
    </>
  );
}
