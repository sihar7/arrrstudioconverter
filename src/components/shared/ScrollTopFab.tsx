"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";

const R = 25;
const C = 2 * Math.PI * R;

/**
 * FAB kembali ke atas — muncul begitu halaman discroll melewati `deepAfter`.
 * Naik otomatis di atas bar melayang lewat CSS var `--fab-lift` (diset halaman yang punya bar bawah).
 * Cincin progres ditulis langsung ke DOM (ref) → tidak ada render React per frame scroll.
 */
export default function ScrollTopFab({ lifted, deepAfter = 400 }: { lifted?: boolean; deepAfter?: number }) {
  const { t } = useT();
  const ring = useRef<SVGCircleElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (ring.current) ring.current.style.strokeDashoffset = String(C * (1 - (max > 0 ? Math.min(1, y / max) : 0)));
      setVisible(y > deepAfter);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [deepAfter]);

  // Scroll ke atas buatan sendiri (bukan behavior:"smooth" bawaan yang kaku & beda tiap browser):
  // durasi menyesuaikan jarak (420–900 ms), kurva ease-out quint → melambat lembut di puncak.
  // Roda/sentuh/tombol dari pengguna langsung membatalkan supaya tidak "melawan" scroll.
  const anim = useRef(0);
  useEffect(() => () => cancelAnimationFrame(anim.current), []);
  const toTop = () => {
    document.getElementById("main")?.focus({ preventScroll: true }); // fokus untuk keyboard / screen reader
    const from = window.scrollY;
    if (from <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return window.scrollTo(0, 0);
    const dur = Math.min(900, 420 + from * 0.12);
    const t0 = performance.now();
    const stop = () => {
      cancelAnimationFrame(anim.current);
      for (const ev of ["wheel", "touchstart", "keydown"] as const) window.removeEventListener(ev, stop);
    };
    for (const ev of ["wheel", "touchstart", "keydown"] as const) window.addEventListener(ev, stop, { passive: true, once: true });
    cancelAnimationFrame(anim.current);
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      window.scrollTo(0, from * (1 - (1 - Math.pow(1 - p, 5))));
      if (p < 1) anim.current = requestAnimationFrame(step);
      else stop();
    };
    anim.current = requestAnimationFrame(step);
  };

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label={t.common.backToTop}
      title={t.common.backToTop}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={cn(
        "tabbar-glass fixed right-4 z-40 grid size-12 cursor-pointer place-items-center rounded-full text-fg transition-[translate,scale,opacity,bottom] duration-[var(--spring-dur)] ease-[var(--spring-bounce)] active:scale-90 active:duration-100 sm:right-6",
        lifted
          ? "bottom-[calc(80px+env(safe-area-inset-bottom)+var(--fab-lift,0px))] xl:bottom-[calc(24px+var(--fab-lift,0px))]"
          : "bottom-[calc(24px+var(--fab-lift,0px))]",
        visible ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-4 scale-75 opacity-0",
      )}
    >
      <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="28" cy="28" r={R} fill="none" stroke="var(--hairline)" strokeWidth="2" />
        <circle
          ref={ring}
          cx="28"
          cy="28"
          r={R}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C}
        />
      </svg>
      <ArrowUp width={20} height={20} strokeWidth={2} className="relative" />
    </button>
  );
}
