"use client";

import { CheckCircle, WarningTriangle } from "iconoir-react";
import { useT } from "@/hooks/useT";
import type { AudioOptions } from "@/lib/schemas/convert.schema";
import { semiLabel } from "../_utils/helpers";

const fix = (n: number) => Number(n.toFixed(2));

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
    <div className="overflow-hidden rounded-s border border-line bg-bg/40">
      <p className="caps border-b border-line/60 px-3 py-2.5 text-[10.5px] text-fg-3">{c.robloxTitle}</p>
      {changed ? (
        <div className="flex flex-col gap-3 p-3">
          {/* Dua angka yang dicari user, berdampingan */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xs bg-raised px-3 py-2.5">
              <p className="text-[11.5px] text-fg-3">{c.robloxHeard}</p>
              <p className="mt-1 font-display text-[22px] font-bold tabular-nums leading-none text-fg">{speed}×</p>
              <p className="mt-1.5 font-mono text-[11px] text-fg-3">{f(c.robloxHeardValue, { speed })}</p>
            </div>
            <div className="rounded-xs border border-ok/40 bg-ok/[0.06] px-3 py-2.5">
              <p className="text-[11.5px] text-fg-3">{c.robloxFill}</p>
              <p className="mt-1 font-display text-[22px] font-bold tabular-nums leading-none text-ok">1</p>
              <p className="mt-1.5 text-[11px] text-ok">{c.robloxFillValue}</p>
            </div>
          </div>
          <p className="text-[12.5px] leading-relaxed text-fg-2">
            {f(c.robloxWhy, { speed })}
            {o.pitch !== 0 && ` ${f(c.robloxPitchNote, { pitch: semiLabel(o.pitch) })}`}
          </p>
          <p className="flex items-start gap-1.5 text-[12px] leading-snug text-warn">
            <WarningTriangle width={14} height={14} aria-hidden="true" className="mt-px shrink-0" />
            {f(c.robloxDouble, { speed, double: fix(speed * speed) })}
          </p>
          <p className="text-[12px] leading-snug text-fg-3">{f(c.robloxBack, { back: fix(1 / speed) })}</p>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 p-3 text-[12.5px] text-ok">
          <CheckCircle width={15} height={15} aria-hidden="true" /> {c.robloxNormal}
        </p>
      )}
    </div>
  );
}
