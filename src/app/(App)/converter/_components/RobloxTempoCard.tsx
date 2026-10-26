"use client";

import type { ReactNode } from "react";
import { CheckCircle, InfoCircle, Undo, WarningTriangle } from "iconoir-react";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import type { AudioOptions } from "@/lib/schemas/convert.schema";
import { semiLabel } from "../_utils/helpers";

const fix = (n: number) => Number(n.toFixed(2));

/** Ubin angka: label · nilai besar · keterangan — dua ubin selalu sejajar & setinggi */
function Stat({ label, value, caption, tone }: { label: string; value: string; caption: string; tone?: "ok" }) {
  return (
    <div className={cn("flex min-w-0 flex-col rounded-xs bg-raised px-3 py-2.5", tone === "ok" && "ring-1 ring-inset ring-ok/35")}>
      <p className="truncate text-[11.5px] text-fg-3">{label}</p>
      <p className={cn("mt-1.5 font-display text-[22px] font-bold tabular-nums leading-none", tone === "ok" ? "text-ok" : "text-fg")}>{value}</p>
      <p className="mt-1.5 truncate text-[11px] text-fg-3">{caption}</p>
    </div>
  );
}

/** Baris catatan berikon */
function Note({ icon, className, children }: { icon: ReactNode; className?: string; children: ReactNode }) {
  return (
    <li className={cn("flex items-start gap-2 px-3 py-2.5 text-[12.5px] leading-snug", className)}>
      <span aria-hidden="true" className="mt-px shrink-0">
        {icon}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

/**
 * Playback di Roblox untuk setelan ini. Kecepatan TERTANAM di file yang diupload:
 * terdengar setara PlaybackSpeed = speed, tapi field Sound.PlaybackSpeed tetap 1
 * (diisi speed lagi = dobel). Asset audio Roblox sendiri tidak punya properti kecepatan.
 */
export default function RobloxTempoCard({ options: o }: { options: AudioOptions }) {
  const { t, f } = useT();
  const c = t.converter;
  const speed = fix(o.speed);
  const changed = speed !== 1;

  return (
    <section aria-label={c.robloxTitle} className="overflow-hidden rounded-s border border-line bg-bg/40">
      <p className="caps border-b border-line/60 px-3 py-2.5 text-[10.5px] text-fg-3">{c.robloxTitle}</p>

      {/* Dua angka yang dicari user: yang diisi (utama) & yang terdengar */}
      <div className="grid grid-cols-2 gap-2 p-3">
        <Stat label={c.robloxFill} value="1" caption={c.robloxFillValue} tone="ok" />
        <Stat label={c.robloxHeard} value={`${speed}×`} caption={c.robloxHeardValue} />
      </div>

      <ul className="divide-y divide-line/60 border-t border-line/60">
        {changed ? (
          <>
            <Note icon={<InfoCircle width={14} height={14} />} className="text-fg-2">
              {f(c.robloxWhy, { speed })}
              {o.pitch !== 0 && ` ${f(c.robloxPitchNote, { pitch: semiLabel(o.pitch) })}`}
            </Note>
            <Note icon={<WarningTriangle width={14} height={14} />} className="bg-warn/[0.06] text-warn">
              {f(c.robloxDouble, { speed, double: fix(speed * speed) })}
            </Note>
            <Note icon={<Undo width={14} height={14} />} className="text-fg-3">
              {f(c.robloxBack, { back: fix(1 / speed) })}
            </Note>
          </>
        ) : (
          <Note icon={<CheckCircle width={14} height={14} />} className="text-ok">
            {c.robloxNormal}
          </Note>
        )}
      </ul>
    </section>
  );
}
