"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import { SPOOF_KINDS, type SpoofWant } from "@/type/spoof";

const OPTIONS: readonly SpoofWant[] = ["auto", ...SPOOF_KINDS];

/**
 * Pilihan jenis aset spoof — 7 opsi terlalu sempit untuk Segmented, jadi chip yang membungkus ke baris baru.
 * Radiogroup: panah kiri/kanan pindah pilihan (roving tabindex), sama seperti Segmented.
 */
export default function KindPicker({ value, onChange }: { value: SpoofWant; onChange: (v: SpoofWant) => void }) {
  const { t } = useT();
  const S = t.spoof;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const idx = Math.max(0, OPTIONS.indexOf(value));
    const n = (idx + (e.key === "ArrowRight" ? 1 : -1) + OPTIONS.length) % OPTIONS.length;
    onChange(OPTIONS[n]);
    refs.current[n]?.focus();
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-fg-2 desk:text-[12px]">{S.kind}</span>
      <div role="radiogroup" aria-label={S.kind} onKeyDown={onKey} className="flex flex-wrap gap-1.5">
        {OPTIONS.map((k, i) => {
          const active = k === value;
          return (
            <button
              key={k}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(k)}
              className={cn(
                "h-9 cursor-pointer rounded-full px-3.5 text-[13.5px] font-semibold transition-[background-color,color,box-shadow,transform] duration-200 active:scale-[0.96] desk:h-7 desk:px-3 desk:text-[12.5px]",
                active
                  ? "bg-[var(--seg-thumb)] text-fg shadow-[0_3px_8px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.06)]"
                  : "bg-fg/[0.06] text-fg-2 hover:bg-fg/[0.1] hover:text-fg",
              )}
            >
              {S.kinds[k]}
            </button>
          );
        })}
      </div>
      {value === "auto" && <p className="text-[12.5px] leading-relaxed text-fg-3 desk:text-[12px]">{S.kindAutoHint}</p>}
    </div>
  );
}
