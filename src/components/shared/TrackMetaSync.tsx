"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks";
import { metaResolved } from "@/store/slices/converterSlice";
import { trackMeta } from "@/lib/trackMeta";
import { saveHistoryMeta } from "@/lib/coverDecal";

// Riwayat yang cover albumnya sudah dikirim (per tab) → tidak dikirim ulang
const savedCovers = new Set<string>();

/**
 * Lengkapi item antrean dengan artis, album & cover album — dipasang global supaya jalan dari halaman mana pun
 * (YouTube, Converter). Item yang judulnya belum diketahui (masih videoId) ditunggu sampai info job masuk.
 * Begitu convert selesai (ada historyId), cover album & artis (hasil katalog) ikut disimpan ke riwayat.
 */
export default function TrackMetaSync() {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const lang = useAppSelector((s) => s.preferences.lang);
  // String primitif → render ulang hanya saat daftar yang menunggu berubah
  const waiting = useAppSelector((s) =>
    [...new Set(s.converter.items.filter((i) => !i.metaReady && i.title !== i.videoId).map((i) => i.videoId))].join(","),
  );
  const toSave = useAppSelector((s) =>
    s.converter.items
      .filter((i) => i.metaReady && i.cover && i.result?.historyId && !savedCovers.has(i.result.historyId))
      .map((i) => `${i.result!.historyId}\t${i.cover}\t${i.artist ?? ""}`)
      .join("\n"),
  );

  useEffect(() => {
    if (!waiting) return;
    let alive = true;
    void (async () => {
      // Berurutan: katalog musik dibatasi ±20 request/menit per IP
      for (const videoId of waiting.split(",")) {
        const item = store.getState().converter.items.find((i) => i.videoId === videoId && !i.metaReady);
        if (!item) continue;
        const meta = await trackMeta(videoId, item.title, item.author, lang);
        if (!alive) return;
        dispatch(metaResolved({ videoId, ...meta }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [waiting, lang, store, dispatch]);

  useEffect(() => {
    if (!toSave) return;
    for (const line of toSave.split("\n")) {
      const [historyId, url, artist] = line.split("\t");
      savedCovers.add(historyId);
      void saveHistoryMeta(historyId, { cover: { url }, artist: artist || null }).catch(() => savedCovers.delete(historyId));
    }
  }, [toSave]);

  return null;
}
