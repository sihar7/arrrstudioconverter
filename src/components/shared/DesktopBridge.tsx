"use client";

import { useEffect } from "react";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { getDesktop } from "@/type/desktop";

/** Hanya aktif di app desktop: status download native (selesai / gagal) jadi toast di halaman */
export default function DesktopBridge() {
  const { lang } = useT();
  const toast = useToast();

  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop) return;
    return desktop.onDownload((e) => {
      if (e.type === "done") toast(lang === "en" ? `Saved · ${e.name}` : `Tersimpan · ${e.name}`, "ok");
      if (e.type === "failed") toast(lang === "en" ? `Download failed · ${e.name}` : `Download gagal · ${e.name}`, "err");
    });
  }, [lang, toast]);

  return null;
}
