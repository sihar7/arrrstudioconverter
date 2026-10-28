"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import { dismissDesktopDownload, setUpdateNotice } from "@/store/slices/toastSlice";
import { getDesktop } from "@/type/desktop";
import { withBase } from "@/Url/Url";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
const POLL_MS = 5 * 60_000;
// Cek ulang saat tab/jendela kembali difokus, tapi tidak lebih sering dari ini
const FOCUS_GAP_MS = 30_000;

/**
 * Pantau pembaruan selama halaman terbuka → kartu di deck toast (UpdateNotice):
 * - web: /build-id server ≠ build bundle ini (ada deploy baru) → tawarkan muat ulang
 * - app desktop: status electron-updater lewat bridge (unduh → siap restart)
 */
export default function UpdateWatcher() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!BUILD_ID || process.env.NODE_ENV !== "production") return;
    let last = 0;
    let found = false;
    let ctrl: AbortController | null = null;
    const check = async () => {
      if (found || Date.now() - last < FOCUS_GAP_MS) return;
      last = Date.now();
      ctrl?.abort();
      ctrl = new AbortController();
      try {
        const r = await fetch(withBase("/build-id"), { cache: "no-store", signal: ctrl.signal });
        if (!r.ok) return;
        const { id } = (await r.json()) as { id?: string };
        if (id && id !== BUILD_ID) {
          found = true;
          dispatch(setUpdateNotice({ kind: "web", at: Date.now() }));
        }
      } catch {
        // offline / dibatalkan → coba lagi di putaran berikutnya
      }
    };
    const onVisible = () => document.visibilityState === "visible" && void check();
    const timer = setInterval(() => document.visibilityState === "visible" && void check(), POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      clearInterval(timer);
      ctrl?.abort();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [dispatch]);

  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop?.onUpdate) return;
    return desktop.onUpdate((e) => {
      if (e.type === "none") return;
      // Unduhan gagal → kartu progres jangan menggantung (dicoba lagi di cek berikutnya)
      if (e.type === "error") return void dispatch(dismissDesktopDownload());
      const at = Date.now();
      if (e.type === "downloading") dispatch(setUpdateNotice({ kind: "desktop", phase: "downloading", version: e.version, percent: e.percent, bps: e.bps, at }));
      else if (e.type === "ready" || e.type === "manual")
        dispatch(setUpdateNotice({ kind: "desktop", phase: e.type, version: e.version, percent: 100, bps: 0, at }));
    });
  }, [dispatch]);

  return null;
}
