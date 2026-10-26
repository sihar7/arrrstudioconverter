"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Xmark } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";

export interface QuickPick {
  key: string;
  label: string;
  n: number;
  onClick: () => void;
}

/**
 * Dock mode pilih (pengganti checkbox) — kapsul kaca melayang di atas tab bar HP.
 * Kiri: tombol keluar + jumlah terpilih (angka bergulir tiap berubah). Tengah: pilih cepat. Kanan: aksi.
 * Saat terbuka, FAB "ke atas" diangkat setinggi dock lewat CSS var --fab-lift.
 */
export default function SelectionDock({
  open,
  count,
  label,
  quick = [],
  onExit,
  children,
}: {
  open: boolean;
  count: number;
  /** teks jumlah, mis. "3 dipilih" / "Ketuk item untuk memilih" */
  label: string;
  quick?: QuickPick[];
  onExit: () => void;
  children: ReactNode;
}) {
  const { t } = useT();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    if (!open || !el) return;
    const ro = new ResizeObserver(() => root.style.setProperty("--fab-lift", `${el.offsetHeight + 12}px`));
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--fab-lift");
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 flex justify-center px-3 tabless:bottom-6 desk:bottom-[calc(var(--dock-h)+16px)]">
      <div
        ref={ref}
        role="toolbar"
        aria-label={label}
        className="tabbar-glass dock-in pointer-events-auto flex w-full max-w-4xl flex-col gap-2 rounded-[26px] p-2"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onExit}
            aria-label={t.common.cancel}
            title={`${t.common.cancel} (Esc)`}
            className="ios-press grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-fg/[0.08] text-fg-2 hover:text-fg"
          >
            <Xmark width={18} height={18} />
          </button>
          <p className="flex shrink-0 items-baseline gap-1.5 px-1.5 text-[15px] font-semibold" aria-live="polite">
            {count > 0 && (
              <span key={count} className="count-roll inline-block tabular-nums">
                {count}
              </span>
            )}
            <span className={cn(count === 0 && "text-fg-2")}>{label}</span>
          </p>
          {quick.length > 0 && (
            <div className="thin-scroll ml-auto flex min-w-0 gap-1.5 overflow-x-auto">
              {quick.map((q) => (
                <button
                  key={q.key}
                  type="button"
                  disabled={q.n === 0}
                  onClick={q.onClick}
                  className="ios-press inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-fg/[0.06] px-3.5 text-[13px] font-semibold text-fg-2 hover:bg-fg/[0.1] hover:text-fg disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {q.label}
                  <span className="tabular-nums text-fg-3">{q.n}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Baris aksi — wrap rapi di HP, rata kanan di layar lebar */}
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--hairline)] px-1 pt-2 sm:justify-end">{children}</div>
      </div>
    </div>
  );
}
