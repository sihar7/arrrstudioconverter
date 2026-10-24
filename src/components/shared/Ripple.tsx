"use client";

import { useEffect } from "react";

/** Ripple Material global: satu listener delegasi untuk semua elemen .state-layer */
export default function Ripple() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const host = (e.target as Element | null)?.closest<HTMLElement>(".state-layer");
      if (!host || host.matches(":disabled")) return;
      const rect = host.getBoundingClientRect();
      const size = Math.hypot(rect.width, rect.height) * 2;
      const dot = document.createElement("span");
      dot.className = "ripple";
      dot.style.width = dot.style.height = `${size}px`;
      dot.style.left = `${e.clientX - rect.left - size / 2}px`;
      dot.style.top = `${e.clientY - rect.top - size / 2}px`;
      host.appendChild(dot);

      const release = () => {
        dot.classList.add("out");
        window.setTimeout(() => dot.remove(), 400);
        window.removeEventListener("pointerup", release);
        window.removeEventListener("pointercancel", release);
      };
      window.addEventListener("pointerup", release);
      window.addEventListener("pointercancel", release);
    };

    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}
