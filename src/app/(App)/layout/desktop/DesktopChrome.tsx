"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { getDesktop } from "@/type/desktop";
import BottomBar from "./BottomBar";
import TitleBar from "./TitleBar";

/** Isi kulit desktop (dimuat lazy oleh DesktopShell): title bar, bottom bar & jembatan app (tema, menu) */
export default function DesktopChrome() {
  const router = useRouter();
  const theme = useAppSelector((s) => s.preferences.theme);

  // Tombol jendela Windows (overlay native) ikut warna tema web
  useEffect(() => {
    getDesktop()?.setTheme?.(theme);
  }, [theme]);

  // Menu aplikasi / pintasan Ctrl+1… → router web (tanpa muat ulang seperti loadURL)
  useEffect(() => getDesktop()?.onNavigate?.((path) => router.push(path)), [router]);

  return (
    <>
      <TitleBar />
      <BottomBar />
    </>
  );
}
