"use client";

import { Copy } from "iconoir-react";
import { useT } from "@/hooks/useT";
import { useToast } from "@/hooks/useToast";
import { useAppSelector } from "@/store/hooks";
import { cn, copyText } from "@/lib/utils";
import { robloxPlayback } from "@/lib/robloxPlayback";
import { DEFAULT_OPTIONS, type AudioOptions } from "@/lib/schemas/convert.schema";

/**
 * Chip "apa yang diisi di game" untuk satu hasil convert — satu kalimat, tanpa istilah tambahan.
 * Mode "Suara asli" + kecepatan diubah → "Di game: PlaybackSpeed 0.8" (klik = salin angkanya); selain itu tanpa setting.
 */
export default function RobloxPlaybackChip({ options, className }: { options?: Pick<AudioOptions, "speed" | "pitch" | "preservePitch"> | null; className?: string }) {
  const { t, f } = useT();
  const toast = useToast();
  const restoreMode = useAppSelector((s) => s.converter.robloxMode === "restore");
  const pb = robloxPlayback(options ?? DEFAULT_OPTIONS);
  const r = t.converter.rbx;
  const base = "inline-flex h-6 items-center gap-1.5 rounded-xs bg-raised px-2 text-[11.5px] text-fg-2";

  if (pb.speed === 1 || !restoreMode) return <span className={cn(base, className)}>{r.chipNone}</span>;

  const n = pb.restoreSpeed;
  return (
    <button
      type="button"
      title={f(r.chipHint, { n })}
      onClick={async () => {
        if (await copyText(String(n))) toast(f(r.copied, { n }), "ok");
      }}
      className={cn(base, "state-layer cursor-pointer font-semibold text-fg transition-colors hover:bg-hover", className)}
    >
      {f(r.chipSet, { n })}
      <Copy width={12} height={12} aria-hidden="true" className="text-fg-3" />
    </button>
  );
}
