"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Loading bar tipis di atas layar saat pindah halaman.
// Mulai saat link internal diklik, selesai saat pathname berubah.

export default function TopLoader() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [pct, setPct] = useState(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPath = useRef(pathname);

  const stopTick = () => {
    if (tick.current) clearInterval(tick.current);
    tick.current = null;
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;

      if (hide.current) clearTimeout(hide.current);
      stopTick();
      setPct(8);
      setState("loading");
      // Merayap mendekati 90% sampai halaman selesai
      tick.current = setInterval(() => setPct((p) => (p < 90 ? p + (90 - p) * 0.08 : p)), 180);
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      stopTick();
      if (hide.current) clearTimeout(hide.current);
    };
  }, []);

  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;
    stopTick();
    setPct(100);
    setState("done");
    hide.current = setTimeout(() => {
      setState("idle");
      setPct(0);
    }, 380);
  }, [pathname]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[2px]">
      <div
        className="h-full origin-left bg-accent transition-[transform,opacity] ease-[var(--ease)]"
        style={{
          transform: `scaleX(${pct / 100})`,
          opacity: state === "idle" ? 0 : 1,
          transitionDuration: state === "done" ? "300ms, 300ms" : "200ms, 120ms",
          boxShadow: "0 0 8px var(--accent)",
        }}
      />
    </div>
  );
}
