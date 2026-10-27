"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { getDesktop } from "@/type/desktop";
import CommandPalette from "./CommandPalette";
import Sidebar from "./Sidebar";
import TitleBar from "./TitleBar";
import TransportBar from "./TransportBar";

const RAIL_KEY = "arrc_side";
const NARROW = "(max-width: 1099px)";

/**
 * Isi kulit desktop (dimuat lazy oleh DesktopShell): sidebar · toolbar · transport bar · command palette,
 * plus jembatan app (tema tombol jendela, navigasi dari menu/pintasan). Mode rail sidebar = pilihan user
 * (disimpan) ATAU jendela sempit; ditulis ke <html data-side> supaya CSS (--side-w, varian rail:) ikut.
 */
export default function DesktopChrome() {
  const router = useRouter();
  const theme = useAppSelector((s) => s.preferences.theme);
  const [pinnedRail, setPinnedRail] = useState(() => {
    try {
      return localStorage.getItem(RAIL_KEY) === "rail";
    } catch {
      return false;
    }
  });
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches);
  const [palette, setPalette] = useState(false);
  const rail = pinnedRail || narrow;

  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (rail) html.dataset.side = "rail";
    else delete html.dataset.side;
  }, [rail]);

  const toggleRail = useCallback(() => {
    // Jendela sempit: tombol hanya membuka/menutup sementara tanpa mengubah pilihan tersimpan
    setPinnedRail((v) => {
      const next = narrow ? false : !v;
      try {
        localStorage.setItem(RAIL_KEY, next ? "rail" : "wide");
      } catch {
        /* storage diblokir — cukup untuk sesi ini */
      }
      return next;
    });
    if (narrow) setNarrow(false);
  }, [narrow]);

  // Ctrl/⌘+K = command palette · Ctrl/⌘+B = ciutkan sidebar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (k === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      } else if (k === "b" && !(e.target as HTMLElement | null)?.closest("input, textarea, [contenteditable]")) {
        e.preventDefault();
        toggleRail();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleRail]);

  // Tombol jendela Windows (overlay native) ikut warna tema web
  useEffect(() => {
    getDesktop()?.setTheme?.(theme);
  }, [theme]);

  // Menu aplikasi / pintasan Ctrl+1… → router web (tanpa muat ulang seperti loadURL)
  useEffect(() => getDesktop()?.onNavigate?.((path) => router.push(path)), [router]);

  return (
    <>
      <Sidebar rail={rail} onToggleRail={toggleRail} onOpenPalette={() => setPalette(true)} />
      <TitleBar />
      <TransportBar />
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </>
  );
}
