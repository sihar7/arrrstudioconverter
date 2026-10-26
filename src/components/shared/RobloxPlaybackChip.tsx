"use client";

import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";

/**
 * Chip PlaybackSpeed Roblox untuk satu hasil convert. Selalu tampil (kecepatan normal juga),
 * karena nilai yang diisi di Roblox memang selalu 1 — kecepatan sudah tertanam di file.
 */
export default function RobloxPlaybackChip({ speed, className }: { speed: number; className?: string }) {
  const { t, f } = useT();
  const s = Number(speed.toFixed(2));

  return (
    <span title={t.converter.inRobloxHint} className={cn("inline-flex h-6 items-center rounded-xs bg-raised px-2 font-mono text-[11.5px] text-fg-2", className)}>
      {s === 1 ? t.converter.inRobloxNormal : f(t.converter.inRoblox, { speed: s })}
    </span>
  );
}
