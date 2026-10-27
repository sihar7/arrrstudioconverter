"use client";

import { useCallback, useEffect } from "react";
import { previewPlayer, usePreview } from "@/lib/previewPlayer";
import { getDesktop } from "@/type/desktop";
import type { QueueItem } from "@/store/slices/converterSlice";

/**
 * Preview hasil lewat pemutar bersama (lib/previewPlayer). Web: berhenti saat keluar dari Converter.
 * App desktop: tetap diputar & dikendalikan dari mini-player di transport bar.
 */
export function useAudioPreview() {
  const { track, playing } = usePreview();

  useEffect(() => () => void (!getDesktop() && previewPlayer.stop()), []);

  const toggle = useCallback((item: QueueItem) => {
    if (!item.result) return;
    previewPlayer.toggle({ fileId: item.result.fileId, title: item.title, artist: item.artist ?? item.author, cover: item.cover ?? item.thumbnail, duration: item.result.duration });
  }, []);

  return { playing: playing ? (track?.fileId ?? null) : null, toggle };
}
