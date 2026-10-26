"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { withBase } from "@/Url/Url";
import { useAppSelector } from "@/store/hooks";
import { isRunning } from "@/store/slices/converterSlice";
import { useT } from "@/hooks/useT";
import { useHydrated } from "@/hooks/useHydrated";

const supported = () => typeof window !== "undefined" && "Notification" in window;

/**
 * Sinyal progres di luar halaman:
 * - judul tab "(3/10) …" selama batch berjalan → terlihat walau pindah tab
 * - notifikasi browser saat batch selesai & tab sedang tidak dilihat (opt-in)
 */
export function useBatchSignals() {
  const items = useAppSelector((s) => s.converter.items);
  const { t, f } = useT();
  // Baru dibaca setelah hydrate (SSR tidak punya window → hindari hydration mismatch)
  const can = useHydrated() && supported();
  const [optOut, setOptOut] = useState(false);
  // Naik setiap izin berubah → render ulang membaca Notification.permission terbaru
  const [, setPermTick] = useState(0);
  const enabled = can && !optOut && Notification.permission === "granted";
  const baseTitle = useRef<string | null>(null);
  const wasRunning = useRef(false);

  const started = items.filter((i) => i.status !== "idle");
  const running = started.filter((i) => isRunning(i.status)).length;
  const done = started.filter((i) => i.status === "done").length;
  const failed = started.filter((i) => i.status === "error").length;

  // Judul tab
  useEffect(() => {
    if (baseTitle.current == null) baseTitle.current = document.title.replace(/^\(\d+\/\d+\)\s*/, "");
    document.title = running ? `(${done}/${started.length}) ${baseTitle.current}` : baseTitle.current;
  }, [running, done, started.length]);
  useEffect(
    () => () => {
      if (baseTitle.current != null) document.title = baseTitle.current;
    },
    [],
  );

  // Notifikasi saat transisi berjalan → selesai
  useEffect(() => {
    const finished = wasRunning.current && running === 0 && started.length > 0;
    wasRunning.current = running > 0;
    if (!finished || !enabled || !supported() || document.visibilityState === "visible") return;
    const body = failed ? `${f(t.converter.notifyDone, { n: done })} · ${f(t.converter.notifyFailed, { n: failed })}` : f(t.converter.notifyDone, { n: done });
    try {
      const n = new Notification("ARRR STUDIO Converter", { body, icon: withBase("/icon.png"), tag: "arrc-batch" });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch {
      /* beberapa browser HP hanya mengizinkan notifikasi lewat service worker */
    }
  }, [running, started.length, done, failed, enabled, t, f]);

  const toggle = useCallback(async () => {
    if (!supported()) return;
    if (enabled) return setOptOut(true);
    if (Notification.permission === "default") await Notification.requestPermission();
    setOptOut(false);
    setPermTick((n) => n + 1);
  }, [enabled]);

  return { notify: enabled, toggleNotify: toggle, notifySupported: can };
}
