"use client";

import { useEffect, useState, type RefObject } from "react";
import { getDesktop, type ClaudeViewState, type DesktopClaude } from "@/type/desktop";

// Claude.ai asli (WebContentsView app desktop) di mode Alice. View native selalu digambar di ATAS halaman,
// jadi saat popover/dialog web terbuka view disembunyikan sementara dan diganti cuplikan gambar (frozen).
const OVERLAY = '.ios-pop[data-open="true"], dialog[open], [role="menu"]';

export const claudeBridge = (): DesktopClaude | undefined => getDesktop()?.claude;

/** Status view (profil aktif, memuat, dsb.) — dipakai sidebar & area */
export function useClaudeState() {
  const [state, setState] = useState<ClaudeViewState | null>(null);
  useEffect(() => {
    const c = claudeBridge();
    if (!c) return;
    let alive = true;
    void c.getState().then((s) => alive && s && setState(s));
    const off = c.onState(setState);
    return () => {
      alive = false;
      off();
    };
  }, []);
  return state;
}

/** Tempelkan view Claude.ai tepat di atas elemen `area`, ikut ukurannya; lepas saat halaman ditinggalkan */
export function useClaudeView(area: RefObject<HTMLElement | null>) {
  const [frozen, setFrozen] = useState<string | null>(null);

  useEffect(() => {
    const c = claudeBridge();
    const el = area.current;
    if (!c || !el) return;
    const rect = () => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    };

    c.show(rect());
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => c.setBounds(rect()));
    };
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    window.addEventListener("resize", sync);
    // Lebar sidebar berubah (rail) lewat transisi CSS → ukur ulang sampai transisi selesai
    document.addEventListener("transitionend", sync);

    let covered = false;
    let seq = 0; // jawaban freeze yang telat diabaikan
    const check = async () => {
      const now = Boolean(document.querySelector(OVERLAY));
      if (now === covered) return;
      covered = now;
      const id = ++seq;
      if (now) {
        const img = await c.freeze();
        if (id === seq) setFrozen(img);
      } else {
        c.unfreeze();
        setFrozen(null);
      }
    };
    const mo = new MutationObserver(() => void check());
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-open", "open"] });

    return () => {
      seq++;
      cancelAnimationFrame(frame);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", sync);
      document.removeEventListener("transitionend", sync);
      c.unfreeze();
      c.hide();
    };
  }, [area]);

  return frozen;
}
