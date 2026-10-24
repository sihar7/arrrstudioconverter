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

  const toTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    // Pindahkan fokus ke konten utama untuk pengguna keyboard / screen reader
    document.getElementById("main")?.focus({ preventScroll: true });
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
        "state-layer mat fixed right-4 z-40 grid size-12 cursor-pointer place-items-center rounded-s bg-raised text-fg shadow-[var(--elev-3)] transition-[transform,opacity,bottom] duration-300 ease-[var(--ease-decel)] active:scale-[0.94] sm:right-6",
        lifted
          ? "bottom-[calc(88px+env(safe-area-inset-bottom)+var(--fab-lift,0px))] xl:bottom-[calc(24px+var(--fab-lift,0px))]"
          : "bottom-[calc(24px+var(--fab-lift,0px))]",
        visible ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-4 scale-75 opacity-0",
      )}
    >
      <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="28" cy="28" r={R} fill="none" stroke="var(--line)" strokeWidth="2" />
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
