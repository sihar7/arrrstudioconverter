"use client";

import { useEffect } from "react";

/**
 * Lampu studio global: menulis --mx/--my (px) ke <html> mengikuti kursor,
 * dipakai sorot lembut di latar forged & hero. Satu listener pasif + rAF;
 * mati di perangkat sentuh dan saat prefers-reduced-motion.
 */
export default function StudioLight() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || calm.matches) return;

    const root = document.documentElement;
    let frame = 0;
    let x = 0;
    let y = 0;
    const write = () => {
      frame = 0;
      root.style.setProperty("--mx", `${x}px`);
      root.style.setProperty("--my", `${y}px`);
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
      root.style.removeProperty("--mx");
      root.style.removeProperty("--my");
    };
  }, []);
  return null;
}
