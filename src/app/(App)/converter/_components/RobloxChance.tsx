"use client";

import { ArrowRight, InfoCircle } from "iconoir-react";
import { cn } from "@/lib/utils";
import ArrCard from "@/components/arr/ArrCard";

export type ChanceLevel = "high" | "mid" | "low";

export const chanceLevel = (pct: number): ChanceLevel => (pct >= 70 ? "high" : pct >= 45 ? "mid" : "low");

const TONE: Record<ChanceLevel, { text: string; bg: string }> = {
  high: { text: "text-ok", bg: "bg-ok" },
  mid: { text: "text-warn", bg: "bg-warn" },
  low: { text: "text-err", bg: "bg-err" },
};

const TICKS = 24;

/** Meter tipis untuk ubin preset — lebar isi via scaleX (GPU only) */
export function ChanceBar({ pct, className }: { pct: number; className?: string }) {
  const tone = TONE[chanceLevel(pct)];
  return (
    <span aria-hidden="true" className={cn("relative block h-[3px] overflow-hidden rounded-full bg-fg/[0.09]", className)}>
      <span
        className={cn("absolute inset-0 origin-left rounded-full transition-transform duration-500 ease-[var(--ease)] motion-reduce:transition-none", tone.bg)}
        style={{ transform: `scaleX(${pct / 100})` }}
      />
    </span>
  );
}

/**
 * Kartu peluang (ARR card varian "chance") lolos moderasi Roblox untuk setelan aktif: angka besar + meter garis-garis (tick)
 * yang bergerak live saat setelan diubah, sumber angkanya, dan saran 1-klik ke preset yang lebih aman.
 */
export function ChanceCard({
  pct,
  title,
  levelLabel,
  basis,
  disclaimer,
  suggestion,
}: {
  pct: number;
  title: string;
  levelLabel: string;
  basis: string;
  disclaimer: string;
  suggestion?: { label: string; hint: string; onClick: () => void };
}) {
  const level = chanceLevel(pct);
  const tone = TONE[level];
  const lit = Math.round((pct / 100) * TICKS);
  return (
    <ArrCard
      variant="chance"
      as="section"
      tone={level}
      label={title}
      meta={[
        title,
        <span key="i" title={disclaimer} className="inline-flex cursor-help text-fg-3 hover:text-fg-2">
          <InfoCircle width={12} height={12} aria-hidden="true" />
          <span className="sr-only">{disclaimer}</span>
        </span>,
      ]}
      aside={levelLabel}
      text={basis}
      foot={
        suggestion && (
          <button
            type="button"
            onClick={suggestion.onClick}
            className="state-layer group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xs border border-line px-3 py-2.5 text-left transition-[border-color,transform] hover:border-line-2 active:scale-[0.98]"
          >
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-fg">{suggestion.label}</span>
              <span className="block text-[12px] text-ok">{suggestion.hint}</span>
            </span>
            <ArrowRight width={16} height={16} aria-hidden="true" className="shrink-0 text-fg-2 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        )
      }
    >
      <p className="mt-2 font-display text-[34px] font-semibold leading-none tabular-nums text-fg" aria-live="polite">
        {pct}
        <span className="text-[18px] text-fg-3">%</span>
      </p>
      <div aria-hidden="true" className="mt-3 flex h-6 items-end gap-[3px]">
        {Array.from({ length: TICKS }, (_, i) => (
          <span
            key={i}
            className={cn("flex-1 rounded-[1.5px] transition-colors duration-300 motion-reduce:transition-none", i < lit ? tone.bg : "bg-fg/[0.09]")}
            // Tick naik bertahap → terbaca "makin kanan makin aman"; nyala berurutan saat angka naik
            style={{ height: `${40 + (i / (TICKS - 1)) * 60}%`, transitionDelay: `${i * 8}ms` }}
          />
        ))}
      </div>
    </ArrCard>
  );
}
