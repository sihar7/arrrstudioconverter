"use client";

import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { robloxPlayback } from "@/lib/robloxPlayback";
import { DEFAULT_OPTIONS, type AudioOptions } from "@/lib/schemas/convert.schema";

/**
 * Chip PlaybackSpeed Roblox untuk satu hasil convert. Selalu tampil (kecepatan normal juga),
 * karena nilai yang diisi di Roblox memang 1 — kecepatan sudah tertanam di file.
 * Bila kecepatan diubah, ikut ditampilkan PlaybackSpeed untuk membalik ke tempo asli.
 */
export default function RobloxPlaybackChip({ options, className }: { options?: Pick<AudioOptions, "speed" | "pitch" | "preservePitch"> | null; className?: string }) {
  const { t, f } = useT();
  const pb = robloxPlayback(options ?? DEFAULT_OPTIONS);

  return (
    <span title={t.converter.inRobloxHint} className={cn("inline-flex h-6 items-center rounded-xs bg-raised px-2 font-mono text-[11.5px] text-fg-2", className)}>
      {pb.speed === 1 ? t.converter.inRobloxNormal : f(t.converter.inRoblox, { speed: pb.speed, back: pb.restoreSpeed })}
    </span>
  );
}
