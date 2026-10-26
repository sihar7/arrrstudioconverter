"use client";

import dynamic from "next/dynamic";
import { useHydrated } from "@/hooks/useHydrated";
import { getDesktop } from "@/type/desktop";

// Title bar + bottom bar hanya diunduh di app desktop — pengunjung web tidak membayar JS-nya
const DesktopChrome = dynamic(() => import("./DesktopChrome"), { ssr: false });

/**
 * Kulit aplikasi desktop (Electron): title bar sendiri di atas + bottom bar navigasi yang menempel di tepi
 * bawah jendela, menggantikan navbar/tab bar/footer web. Kerangka polos di bawah ini ikut SSR dan baru
 * terlihat lewat varian `desk:` (atribut dipasang skrip head sebelum paint) → tempatnya sudah terpesan
 * sebelum JS jalan, tanpa kedip navbar web. Penanda CSS: `desk-own-bar` = halaman menggambar title bar sendiri
 * (selain itu, mis. admin, dapat title bar polos) · `desk-shell` = ada bottom bar (jalur scrollbar berhenti di atasnya).
 */
export default function DesktopShell() {
  const hydrated = useHydrated();
  return (
    <>
      <div
        aria-hidden="true"
        className="desk-shell desk-own-bar app-drag fixed inset-x-0 top-0 z-40 hidden h-[var(--bar-h)] border-b border-line/60 bg-bg desk:block"
      />
      <div aria-hidden="true" className="fixed inset-x-0 bottom-0 z-40 hidden h-[var(--dock-h)] border-t border-line/60 bg-surface desk:block" />
      {hydrated && getDesktop() && <DesktopChrome />}
    </>
  );
}
