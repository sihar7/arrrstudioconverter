"use client";

import type { CSSProperties } from "react";
import { Check, Link as LinkIcon } from "iconoir-react";
import { useT } from "@/hooks/useT";
import { SfWaveform } from "@/components/icons/SfIcons";
import AppIcon from "@/components/ui/AppIcon";
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

// Monokrom silver (rombak 2026-10-31): cincin dibedakan label & nilai, bukan warna
const RING_TONES = ["var(--accent-strong)", "var(--accent)", "var(--p-silver-60)", "var(--accent)"];
const RR = 26;
const RC = 2 * Math.PI * RR;

/** Cincin gauge ala Apple Watch (pengganti kenop): arc terisi sesuai nilai, animasi isi saat muncul */
function Ring({ label, value, turn, tone }: { label: string; value: string; turn: number; tone: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative grid size-[68px] place-items-center">
        <svg viewBox="0 0 64 64" className="absolute inset-0 size-full -rotate-90">
          <circle cx="32" cy="32" r={RR} fill="none" stroke={tone} strokeOpacity="0.14" strokeWidth="7" />
          <circle
            cx="32"
            cy="32"
            r={RR}
            fill="none"
            stroke={tone}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={RC}
            className="ring-fill"
            style={{ "--ring-off": RC * (1 - Math.max(0.04, turn)), "--ring-full": RC } as CSSProperties}
          />
        </svg>
        <span className="relative font-mono text-[12px] font-semibold tabular-nums text-fg">{value}</span>
      </div>
      <span className="text-[12px] font-medium text-fg-3">{label}</span>
    </div>
  );
}

/**
 * Showcase: konsol converter bergaya app iOS (dekoratif, aria-hidden).
 * Playhead & cincin memakai transform/clip-path/dashoffset saja — ringan.
 */
export default function Console() {
  const { t } = useT();
  const m = t.landing.mock;
  return (
    <div aria-hidden="true" className="mat overflow-hidden rounded-[28px] border border-[var(--hairline)] bg-surface shadow-[0_50px_120px_rgba(0,0,0,.45)]">
      {/* Bar atas ala app */}
      <div className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-3.5">
        <span className="flex items-center gap-3">
          <AppIcon tone="pink" size={30}>
            <SfWaveform filled />
          </AppIcon>
          <span className="text-[15px] font-semibold tracking-[-0.01em]">ARRR Converter</span>
        </span>
        <span className="flex items-center gap-2 rounded-full bg-ok/15 px-2.5 py-1 text-[12px] font-semibold text-ok">
          <span className="relative flex size-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60" />
            <span className="size-1.5 rounded-full bg-current" />
          </span>
          {m.ready}
        </span>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-6 p-5 sm:p-7">
          {/* Field tautan kapsul */}
          <div className="flex h-12 items-center gap-3 rounded-full bg-fg/[0.06] pl-4 pr-1.5">
            <LinkIcon width={16} height={16} className="shrink-0 text-fg-3" />
            <span className="truncate text-[14px] text-fg-2">{m.url}</span>
            <span className="ml-auto hidden h-9 items-center rounded-full bg-accent bg-[image:var(--sheen)] px-4 font-mono text-[13px] font-medium text-on-accent sm:flex">Convert</span>
          </div>

          {/* Trek + waveform */}
          <div>
            <div className="flex items-center gap-4">
              <AppIcon tone="indigo" size={48}>
                <SfWaveform filled />
              </AppIcon>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-semibold tracking-[-0.01em]">{m.track}</p>
                <p className="truncate text-[13px] text-fg-3">{m.artist}</p>
              </div>
              <span className="font-mono text-[12px] tabular-nums text-fg-3">1:24 / 3:42</span>
            </div>
            <div className="relative mt-5 h-24 overflow-hidden">
              <Wave className="absolute inset-0 size-full fill-[var(--line)]" />
              <div className="console-played absolute inset-0">
                <Wave className="size-full fill-[var(--fg)]" />
              </div>
              <div className="console-head absolute inset-0">
                <span className="absolute inset-y-0 left-0 w-0.5 rounded-full bg-accent-strong shadow-[0_0_10px_rgb(243_244_246/0.6)]" />
              </div>
            </div>
          </div>

          {/* Cincin efek */}
          <div className="grid grid-cols-4 gap-2 border-t border-[var(--hairline)] pt-6">
            {m.knobs.map((k, i) => (
              <Ring key={k.label} {...k} tone={RING_TONES[i % RING_TONES.length]} />
            ))}
          </div>
        </div>

        {/* Output Roblox — daftar grouped iOS */}
        <div className="flex flex-col gap-5 border-t border-[var(--hairline)] p-5 sm:p-7 lg:border-l lg:border-t-0">
          <p className="text-[13px] font-semibold text-fg-3">{m.output}</p>
          <div>
            <p className="flex items-center gap-2.5 text-[17px] font-semibold">
              <span className="grid size-6 place-items-center rounded-full bg-ok text-bg">
                <Check width={15} height={15} strokeWidth={2.6} />
              </span>
              {m.uploaded}
            </p>
            <p className="mt-3 break-all rounded-[12px] bg-fg/[0.06] px-3 py-2 font-mono text-[13px] text-fg">rbxassetid://1928374650</p>
          </div>
          <dl className="mt-auto overflow-hidden rounded-[14px] bg-fg/[0.045] text-[14px]">
            {[
              ["Format", "OGG · 48 kHz"],
              ["Status", m.review],
              ["Place", "✓"],
            ].map(([k, v], i) => (
              <div key={k} className="flex items-center justify-between gap-3 border-t border-[var(--hairline)] px-3.5 py-2.5 first:border-t-0">
                <dt className="text-fg-2">{k}</dt>
                <dd className={i === 1 ? "font-semibold text-warn" : i === 2 ? "font-semibold text-ok" : "font-mono text-[13px] text-fg-2"}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
