"use client";

import { Check, Link as LinkIcon, MusicDoubleNote } from "iconoir-react";
import { useT } from "@/hooks/useT";
import { LogoMark } from "@/components/shared/Logo";

// Waveform cermin deterministik (tanpa random → render server & client sama)
const BARS = Array.from({ length: 132 }, (_, i) => {
  const env = 0.45 + 0.55 * Math.sin((i / 131) * Math.PI);
  const v = Math.abs(Math.sin(i * 0.37) * 0.6 + Math.sin(i * 0.11 + 1.3) * 0.4);
  // dibulatkan: Math.sin di Node & browser bisa beda di digit terakhir → hydration mismatch
  return Math.round(Math.max(0.08, Math.min(1, env * (0.25 + v * 0.85))) * 100) / 100;
});
const W = 660;
const H = 96;
const STEP = W / BARS.length;

function Wave({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className}>
      {BARS.map((v, i) => {
        const h = Math.round(v * (H - 4) * 10) / 10;
        const x = Math.round(i * STEP * 100) / 100;
        return <rect key={i} x={x} y={(H - h) / 2} width={2.75} height={h} rx={0.6} />;
      })}
    </svg>
  );
}

/** Kenop logam terpoles; turn 0–1 → sudut -135°…135° */
function Knob({ label, value, turn }: { label: string; value: string; turn: number }) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative grid size-16 place-items-center rounded-full border border-line/70 bg-bg/60 shadow-[inset_0_2px_6px_rgba(0,0,0,.45)]">
        <div
          className="relative size-11 rounded-full"
          style={{ background: "var(--knob)", boxShadow: "var(--knob-shadow)", transform: `rotate(${-135 + turn * 270}deg)` }}
        >
          <span className="absolute left-1/2 top-1 h-3 w-[2px] -translate-x-1/2 rounded-full bg-bg" />
        </div>
      </div>
      <span className="caps text-[9.5px] text-fg-3">{label}</span>
      <span className="-mt-1.5 font-mono text-[12px] text-fg">{value}</span>
    </div>
  );
}

/**
 * Showcase: konsol converter bergaya perangkat audio hi-fi (dekoratif, aria-hidden).
 * Playhead berjalan memakai transform/clip-path saja — ringan.
 */
export default function Console() {
  const { t } = useT();
  const m = t.landing.mock;
  return (
    <div aria-hidden="true" className="mat overflow-hidden rounded-l border border-line/60 bg-surface shadow-[0_50px_120px_rgba(0,0,0,.45)]">
      {/* Bar atas */}
      <div className="flex items-center justify-between border-b border-line/60 px-5 py-3.5">
        <span className="flex items-center gap-3">
          <LogoMark />
          <span className="caps text-[10.5px] text-fg-2">ARRR · Converter</span>
        </span>
        <span className="caps flex items-center gap-2 text-[10px] text-ok">
          <span className="relative flex size-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60" />
            <span className="size-1.5 rounded-full bg-current" />
          </span>
          {m.ready}
        </span>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-6 p-5 sm:p-7">
          {/* Input tautan */}
          <div className="flex h-12 items-center gap-3 rounded-s border border-line-2 bg-bg/50 pl-4 pr-1.5">
            <LinkIcon width={15} height={15} className="shrink-0 text-fg-3" />
            <span className="truncate font-mono text-[13px] text-fg-2">{m.url}</span>
            <span className="btn-plate caps ml-auto hidden h-9 items-center rounded-xs bg-accent px-4 text-[10.5px] text-on-accent sm:flex">
              Convert
            </span>
          </div>

          {/* Trek + waveform */}
          <div>
            <div className="flex items-center gap-4">
              <div className="forged-tile grid size-12 shrink-0 place-items-center rounded-s text-fg">
                <MusicDoubleNote width={18} height={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{m.track}</p>
                <p className="truncate text-[13px] text-fg-3">{m.artist}</p>
              </div>
              <span className="font-mono text-[12px] tabular-nums text-fg-3">1:24 / 3:42</span>
            </div>
            <div className="relative mt-5 h-24 overflow-hidden">
              <Wave className="absolute inset-0 size-full fill-[var(--line-2)]" />
              <div className="console-played absolute inset-0">
                <Wave className="size-full fill-[var(--accent)]" />
              </div>
              <div className="console-head absolute inset-0">
                <span className="absolute inset-y-0 left-0 w-px bg-fg" />
              </div>
            </div>
          </div>

          {/* Kenop */}
          <div className="grid grid-cols-4 gap-2 border-t border-line/60 pt-6">
            {m.knobs.map((k) => (
              <Knob key={k.label} {...k} />
            ))}
          </div>
        </div>

        {/* Output Roblox */}
        <div className="flex flex-col gap-5 border-t border-line/60 p-5 sm:p-7 lg:border-l lg:border-t-0">
          <p className="eyebrow">{m.output}</p>
          <div>
            <p className="flex items-center gap-2 text-[16px] font-semibold">
              <span className="grid size-6 place-items-center rounded-xs bg-ok/15 text-ok">
                <Check width={14} height={14} strokeWidth={2.2} />
              </span>
              {m.uploaded}
            </p>
            <p className="mt-3 break-all font-mono text-[13px] text-fg">rbxassetid://1928374650</p>
          </div>
          <dl className="mt-auto flex flex-col text-[13px]">
            {[
              ["Format", "OGG · 48 kHz"],
              ["Status", m.review],
              ["Place", "✓"],
            ].map(([k, v], i) => (
              <div key={k} className="flex items-center justify-between gap-3 border-t border-line/60 py-2.5">
                <dt className="caps text-[10px] text-fg-3">{k}</dt>
                <dd className={i === 1 ? "font-medium text-warn" : i === 2 ? "font-medium text-ok" : "font-mono text-fg-2"}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
