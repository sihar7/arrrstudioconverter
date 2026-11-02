"use client";

import { Check, FireFlame, Lock, Xmark } from "iconoir-react";
import { cn } from "@/lib/utils";
import IconButton from "@/components/ui/IconButton";
import { chanceLevel } from "./RobloxChance";

// Pemilih preset ala channel strip mixer — bukan grid kartu seragam:
//   FeaturedPreset = satu sorotan "paling banyak dipakai" (besar, jelas)
//   PresetRow      = daftar rapat; kanan = meter level (motif sama dengan meter peluang) + angka %

const SEG = 10;
const TONE = { high: "bg-ok", mid: "bg-warn", low: "bg-err" } as const;
const TEXT = { high: "text-ok", mid: "text-warn", low: "text-err" } as const;

/** Meter level 10 segmen naik bertahap — terbaca "makin penuh makin aman" */
export function LevelMeter({ pct, className }: { pct: number; className?: string }) {
  const lit = Math.round((pct / 100) * SEG);
  const tone = TONE[chanceLevel(pct)];
  return (
    <span aria-hidden="true" className={cn("flex h-4 items-end gap-[2px]", className)}>
      {Array.from({ length: SEG }, (_, i) => (
        <i
          key={i}
          className={cn("w-[3px] rounded-[1px] transition-colors duration-300 motion-reduce:transition-none", i < lit ? tone : "bg-fg/[0.12]")}
          style={{ height: `${35 + (i / (SEG - 1)) * 65}%`, transitionDelay: `${i * 12}ms` }}
        />
      ))}
    </span>
  );
}

interface Common {
  name: string;
  desc: string;
  pct: number;
  active: boolean;
  /** label plan yang dibutuhkan; diisi = terkunci */
  locked?: string;
  onClick: () => void;
  passLabel: string;
}

/** Sorotan preset terpopuler: eyebrow api + nama besar + peluang & pangsa pemakaian */
export function FeaturedPreset({ name, desc, pct, active, locked, onClick, passLabel, eyebrow, share, useLabel, usingLabel }: Common & { eyebrow: string; share: string; useLabel: string; usingLabel: string }) {
  const level = chanceLevel(pct);
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={Boolean(locked)}
      onClick={onClick}
      className={cn(
        "arr-card group relative w-full cursor-pointer overflow-hidden text-left disabled:cursor-not-allowed",
        "rounded-[14px] border p-4 transition-[border-color,background-color,transform] duration-200 active:scale-[0.985] desk:rounded-[10px]",
        active ? "border-fg/30 bg-fg/[0.1]" : "border-fg/[0.12] bg-fg/[0.05] hover:border-fg/25 hover:bg-fg/[0.07]",
      )}
      data-variant="featured"
    >
      <span className="relative flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg">
        <FireFlame width={14} height={14} aria-hidden="true" className="text-warn" />
        {eyebrow}
      </span>
      <span className="relative mt-2 flex items-end justify-between gap-3">
        <span className="min-w-0">
          <span className="flex items-center gap-2 font-display text-[22px] font-bold leading-tight text-fg">
            <span className="truncate">{name}</span>
            {active && <Check width={18} height={18} strokeWidth={2.2} aria-hidden="true" className="pick-pop shrink-0" />}
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] text-fg-3">{desc}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className={cn("block font-display text-[28px] font-bold leading-none tabular-nums", TEXT[level])}>{pct}%</span>
          <span className="mt-1 block text-[11px] text-fg-3">{passLabel}</span>
        </span>
      </span>
      <span className="relative mt-3 flex items-center justify-between gap-3 border-t border-fg/[0.08] pt-3 text-[12px]">
        <span className="text-fg-2">{share}</span>
        {locked ? (
          <span className="inline-flex items-center gap-1 text-fg-3">
            <Lock width={12} height={12} aria-hidden="true" /> {locked}
          </span>
        ) : (
          <span className={cn("rounded-full px-2.5 py-1 text-[11.5px] font-semibold", active ? "bg-fg text-bg" : "bg-fg/[0.1] text-fg group-hover:bg-fg/[0.16]")}>
            {active ? usingLabel : useLabel}
          </span>
        )}
      </span>
    </button>
  );
}

/** Satu baris preset di daftar: nama + deskripsi · meter + % */
export function PresetRow({ name, desc, pct, active, locked, onClick, passLabel, onDelete, deleteLabel }: Common & { onDelete?: () => void; deleteLabel?: string }) {
  const level = chanceLevel(pct);
  return (
    <li className="group/p relative">
      <button
        type="button"
        aria-pressed={active}
        disabled={Boolean(locked)}
        onClick={onClick}
        title={`${pct}% ${passLabel}`}
        className={cn(
          "relative flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors duration-150 disabled:cursor-not-allowed",
          active ? "bg-fg/[0.09]" : "hover:bg-fg/[0.045]",
          onDelete && "pr-11",
        )}
      >
        {/* Rel aktif kiri (ARR card rail) */}
        <span
          aria-hidden="true"
          className={cn("absolute inset-y-2 left-0 w-[3px] origin-center rounded-r-[3px] bg-fg transition-transform duration-200", active ? "scale-y-100" : "scale-y-0")}
        />
        <span className="min-w-0 flex-1">
          <span className={cn("flex items-center gap-1.5 text-[13.5px] font-semibold", locked ? "text-fg-3" : "text-fg")}>
            <span className="truncate">{name}</span>
            {active && <Check width={14} height={14} strokeWidth={2.2} aria-hidden="true" className="pick-pop shrink-0" />}
            {locked && (
              <span className="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-medium text-fg-3">
                <Lock width={11} height={11} aria-hidden="true" />
                {locked}
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-fg-3">{desc}</span>
        </span>
        {!onDelete && (
          <span className="flex shrink-0 items-center gap-2">
            <LevelMeter pct={pct} />
            <span className={cn("w-9 text-right font-mono text-[12px] tabular-nums", TEXT[level])}>{pct}%</span>
          </span>
        )}
      </button>
      {onDelete && (
        <IconButton
          label={deleteLabel ?? ""}
          size="sm"
          icon={<Xmark width={14} height={14} />}
          onClick={onDelete}
          className="absolute right-1 top-1/2 size-9 -translate-y-1/2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/p:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
        />
      )}
    </li>
  );
}

/** Wadah daftar: satu permukaan, pemisah tipis (bukan kartu-kartu terpisah) */
export function PresetList({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <ul aria-label={label} className="divide-y divide-fg/[0.06] overflow-hidden rounded-[14px] bg-fg/[0.035] desk:rounded-[10px]">
      {children}
    </ul>
  );
}
