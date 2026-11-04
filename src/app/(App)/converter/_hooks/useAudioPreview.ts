"use client";

import { useCallback, useEffect, useRef } from "react";
import { previewPlayer, usePreview } from "@/lib/previewPlayer";
import { getDesktop } from "@/type/desktop";
import { robloxPlayback } from "@/lib/robloxPlayback";
import { useAppSelector } from "@/store/hooks";
import type { QueueItem } from "@/store/slices/converterSlice";

/**
 * Preview hasil lewat pemutar bersama (lib/previewPlayer). Web: berhenti saat keluar dari Converter.
 * App desktop: tetap diputar & dikendalikan dari mini-player di transport bar.
 * Mode "Balik ke asli" (Roblox Bypass): diputar dengan PlaybackSpeed yang sama seperti di game → terdengar seperti
 * lagu asli, bukan file 1.4× yang cempreng.
 */
export function useAudioPreview() {
  const { track, playing } = usePreview();
  const restore = useAppSelector((s) => s.converter.robloxMode === "restore");

  useEffect(() => () => void (!getDesktop() && previewPlayer.stop()), []);

  // Item yang sedang diputar dihapus dari antrean (X / Bersihkan / Hapus semua) → audionya ikut berhenti.
  // Hanya fileId yang tadinya ADA di antrean → lagu dari Riwayat (mini-player desktop) tidak ikut terhenti.
  const fileIds = useAppSelector((s) => s.converter.items.map((i) => i.result?.fileId ?? "").join(","));
  const prevIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const now = new Set(fileIds.split(",").filter(Boolean));
    const cur = track?.fileId;
    if (cur && prevIds.current.has(cur) && !now.has(cur)) previewPlayer.stop();
    prevIds.current = now;
  }, [fileIds, track?.fileId]);

  const toggle = useCallback(
    (item: QueueItem) => {
      if (!item.result) return;
      // Hanya bila PlaybackSpeed membalik persis (resample murni); sisa nada butuh PitchShift → putar apa adanya
      const pb = item.options && item.options.speed !== 1 ? robloxPlayback(item.options) : null;
      const rate = restore && pb?.exact ? pb.restoreSpeed : 1;
      // durasi hasil = durasi file; yang ditampilkan = durasi dengar
      const duration = item.result.duration ? item.result.duration / rate : undefined;
      previewPlayer.toggle({ fileId: item.result.fileId, title: item.title, artist: item.artist ?? item.author, cover: item.cover ?? item.thumbnail, duration, rate });
    },
    [restore],
  );

  return { playing: playing ? (track?.fileId ?? null) : null, toggle };
}
