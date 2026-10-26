"use client";

import { useEffect, useState, type RefObject } from "react";
import type { DesktopYoutube, YoutubeState } from "@/type/desktop";

// Elemen web yang bisa muncul di atas area YouTube (menu profil, popover bottom bar, dialog)
const OVERLAY = '.ios-pop[data-open="true"], dialog[open]';

/**
 * Menempelkan view YouTube native (Electron) tepat di atas elemen `area`, mengikuti ukurannya.
 * Saat popover/dialog web terbuka, view disembunyikan sementara dan diganti cuplikan gambar (`frozen`) —
 * view native selalu digambar di atas halaman, jadi tanpa ini popover akan tertutup.
 */
export function useYoutubeView(yt: DesktopYoutube | undefined, area: RefObject<HTMLElement | null>) {
  const [state, setState] = useState<YoutubeState | null>(null);
  const [frozen, setFrozen] = useState<string | null>(null);

  useEffect(() => {
    const el = area.current;
    if (!yt || !el) return;
    const rect = () => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    };

    document.documentElement.dataset.ytView = "";
    yt.show(rect());
    yt.getState().then((s) => s && setState(s));
    const offState = yt.onState(setState);

    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => yt.setBounds(rect()));
    };
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    window.addEventListener("resize", sync);

    let covered = false;
    let seq = 0; // permintaan freeze yang telat dijawab diabaikan
    const checkOverlay = async () => {
      const now = Boolean(document.querySelector(OVERLAY));
      if (now === covered) return;
      covered = now;
      const id = ++seq;
      if (now) {
        const img = await yt.freeze();
        if (id === seq) setFrozen(img);
      } else {
        yt.unfreeze();
        setFrozen(null);
      }
    };
    const mo = new MutationObserver(checkOverlay);
    mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["data-open", "open"] });

    return () => {
      seq++;
      delete document.documentElement.dataset.ytView;
      cancelAnimationFrame(frame);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", sync);
      offState();
      yt.unfreeze();
      yt.hide(true);
    };
  }, [yt, area]);

  return { state, frozen };
}
