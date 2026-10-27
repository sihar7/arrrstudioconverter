"use client";

import { useState, type CSSProperties } from "react";
import { ArrowSeparate } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/useT";
import Segmented from "@/components/ui/Segmented";

type Mode = "after" | "compare";

/**
 * Tampilan hasil alat gambar.
 * - "after": hasil utuh di atas latar kotak-kotak (seperti remove.bg) — default untuk hapus background.
 * - "compare": geser pegangan (mouse, sentuh, atau panah keyboard) untuk membandingkan sebelum/sesudah.
 * Lapisan "sesudah" punya latar kotak-kotaknya SENDIRI: kalau tidak, area transparan memperlihatkan foto asli
 * di bawahnya sehingga latar terlihat tidak terhapus.
 */
export default function CompareView({
  before,
  after,
  ratio,
  busy,
  defaultMode = "compare",
}: {
  before: string;
  after?: string | null;
  ratio: number;
  busy?: boolean;
  defaultMode?: Mode;
}) {
  const { t } = useT();
  const s = t.imgtools;
  const [pos, setPos] = useState(50);
  const [mode, setMode] = useState<Mode>(defaultMode);
  const showAfter = Boolean(after);
  const comparing = showAfter && mode === "compare";

  return (
    <div className="flex w-full flex-col items-center gap-3">
      {showAfter && (
        <Segmented<Mode>
          size="sm"
          label={s.compare}
          value={mode}
          onChange={setMode}
          options={[
            { value: "after", label: s.after },
            { value: "compare", label: s.compareShort },
          ]}
        />
      )}
      <div
        className="checker relative mx-auto max-h-[68vh] w-full overflow-hidden rounded"
        style={{ aspectRatio: String(ratio), maxWidth: `calc(68vh * ${ratio})` } as CSSProperties}
      >
        {(!showAfter || comparing) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={before} alt={s.before} className="absolute inset-0 size-full object-contain" draggable={false} />
        )}
        {showAfter && (
          <div className="checker absolute inset-0" style={comparing ? { clipPath: `inset(0 0 0 ${pos}%)` } : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={after!} alt={s.after} className="absolute inset-0 size-full object-contain" draggable={false} />
          </div>
        )}
        {busy && <div aria-hidden="true" className="scan-shimmer absolute inset-0" />}

        {comparing && (
          <>
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.2)]" style={{ left: `${pos}%` }}>
              <span className="absolute left-1/2 top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-black shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
                <ArrowSeparate width={16} height={16} strokeWidth={2} />
              </span>
            </div>
            <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11.5px] font-semibold text-white backdrop-blur">{s.before}</span>
            <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11.5px] font-semibold text-white backdrop-blur">{s.after}</span>
            <input
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={pos}
              aria-label={s.compare}
              onChange={(e) => setPos(Number(e.target.value))}
              className={cn("absolute inset-0 size-full cursor-ew-resize appearance-none bg-transparent opacity-0")}
            />
          </>
        )}
      </div>
    </div>
  );
}
