"use client";

import { useEffect, useRef } from "react";

/**
 * Lampu studio global: satu elemen sorot (.studio-spot) yang digeser via transform mengikuti kursor.
 * Hanya komposit GPU — tidak menulis CSS var ke <html> (itu memicu recalc style seluruh halaman tiap gerak).
 * Satu listener pasif + rAF; mati di perangkat sentuh dan saat prefers-reduced-motion.
 */
export default function StudioLight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!el || !fine.matches || calm.matches) return;

    let frame = 0;
    let x = 0;
    let y = 0;
    const write = () => {
      frame = 0;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.dataset.on = "";
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(write);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={ref} aria-hidden="true" className="studio-spot" />;
}
