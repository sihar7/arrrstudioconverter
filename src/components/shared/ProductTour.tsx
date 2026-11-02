"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

// Tur onboarding (coach marks): layar digelapkan, satu bagian disorot, balon penjelasan + Kembali/Lanjut.
// Pasang hanya saat terbuka ({open && <ProductTour/>}) → selalu mulai dari langkah 1. Target = id elemen di halaman. Satu set listener (scroll/resize/keydown) per tur terbuka, dibersihkan saat ditutup.

export interface TourStep {
  /** id elemen yang disorot */
  target: string;
  title: string;
  body: string;
}

interface Labels {
  next: string;
  back: string;
  done: string;
  skip: string;
  /** mis. "{i} dari {n}" */
  counter: (i: number, n: number) => string;
}

type Box = { top: number; left: number; width: number; height: number };

const PAD = 8;
const GAP = 12;
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Kotak sorot = bagian elemen yang terlihat di layar (elemen tinggi dipotong ke viewport) */
function measure(id: string): Box | null {
  const el = document.getElementById(id);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const top = Math.max(r.top - PAD, PAD);
  const bottom = Math.min(r.bottom + PAD, window.innerHeight - PAD);
  return { top, left: Math.max(r.left - PAD, PAD), width: Math.min(r.width + PAD * 2, window.innerWidth - PAD * 2), height: Math.max(0, bottom - top) };
}

export default function ProductTour({ steps, open, onClose, labels }: { steps: TourStep[]; open: boolean; onClose: () => void; labels: Labels }) {
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [pop, setPop] = useState<{ top: number; left: number; width: number } | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const step = steps[i];
  const last = i === steps.length - 1;

  // onClose terbaru tanpa memicu ulang effect keyboard tiap render induk
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  // Gulir ke target, lalu ikuti posisinya saat scroll/resize (rAF → maks 1 ukur per frame)
  useEffect(() => {
    if (!open || !step) return;
    const el = document.getElementById(step.target);
    const tall = el ? el.getBoundingClientRect().height > window.innerHeight * 0.7 : false;
    el?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: tall ? "start" : "center" });
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setBox(measure(step.target)));
    };
    update();
    const settle = window.setTimeout(update, reduced() ? 0 : 420);
    window.addEventListener("scroll", update, { passive: true, capture: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      window.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
    };
  }, [open, step]);

  // Posisi balon: di bawah sorotan bila muat, kalau tidak di atas, kalau tidak menempel bawah layar (HP)
  useLayoutEffect(() => {
    if (!open || !box || !popRef.current) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(360, vw - 32);
    const h = popRef.current.offsetHeight;
    const left = Math.min(Math.max(16, box.left + box.width / 2 - width / 2), vw - width - 16);
    let top: number;
    if (box.top + box.height + GAP + h <= vh - 16) top = box.top + box.height + GAP;
    else if (box.top - GAP - h >= 16) top = box.top - GAP - h;
    else top = vh - h - 16;
    setPop({ top, left, width });
  }, [open, box, i]);

  const go = useCallback(
    (d: 1 | -1) => {
      if (d === 1 && last) return closeRef.current();
      setI((n) => Math.min(steps.length - 1, Math.max(0, n + d)));
    },
    [last, steps.length],
  );

  // Keyboard: Esc tutup, panah pindah langkah; fokus ke tombol utama tiap ganti langkah
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    nextRef.current?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go, i]);

  if (!open || !step || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000]" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body">
      {/* Penangkap klik: halaman tidak bisa disentuh selama tur */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      {/* Sorotan: bayangan raksasa menggelapkan sekeliling, lubangnya = target */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed rounded-[18px] ring-2 ring-fg/50 transition-[top,left,width,height] duration-300 ease-[var(--ease)] motion-reduce:transition-none"
        style={{ ...(box ?? { top: -9999, left: -9999, width: 0, height: 0 }), boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.66)" }}
      />
      <div
        ref={popRef}
        className={cn(
          "fixed rounded-[16px] border border-fg/10 bg-raised p-4 text-fg shadow-[var(--elev-3)] transition-[top,left,opacity] duration-300 ease-[var(--ease)] motion-reduce:transition-none",
          pop ? "opacity-100" : "opacity-0",
        )}
        style={pop ?? { top: 0, left: 16, width: Math.min(360, (typeof window !== "undefined" ? window.innerWidth : 392) - 32) }}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Titik progres: langkah sekarang memanjang */}
          <span className="flex items-center gap-1.5" aria-label={labels.counter(i + 1, steps.length)}>
            {steps.map((s, n) => (
              <span key={s.target + n} aria-hidden="true" className={cn("h-1.5 rounded-full transition-[width,background-color] duration-300", n === i ? "w-5 bg-fg" : "w-1.5 bg-fg/25")} />
            ))}
          </span>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-full px-2 py-1 text-[12.5px] text-fg-3 hover:text-fg">
            {labels.skip}
          </button>
        </div>
        <p id="tour-title" className="mt-3 font-display text-[18px] font-bold leading-snug">
          {step.title}
        </p>
        <p id="tour-body" className="mt-1.5 text-[13.5px] leading-relaxed text-fg-2">
          {step.body}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="font-mono text-[11.5px] tabular-nums text-fg-3">{labels.counter(i + 1, steps.length)}</span>
          <span className="flex gap-2">
            {i > 0 && (
              <button type="button" onClick={() => go(-1)} className="h-10 cursor-pointer rounded-full px-4 text-[13.5px] font-semibold text-fg-2 hover:bg-fg/[0.07] hover:text-fg">
                {labels.back}
              </button>
            )}
            <button
              ref={nextRef}
              type="button"
              onClick={() => go(1)}
              className="h-10 cursor-pointer rounded-full bg-fg px-5 text-[13.5px] font-semibold text-bg transition-transform active:scale-95"
            >
              {last ? labels.done : labels.next}
            </button>
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
