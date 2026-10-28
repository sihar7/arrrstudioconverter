"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { baseApi } from "@/store/api/baseApi";
import { useT } from "@/hooks/useT";
import { findMeta } from "@/lib/trackMeta";
import { saveHistoryCover, saveHistoryMeta } from "@/lib/coverDecal";
import { fetchTextureId } from "../../skybox/_service/skybox.service";
import type { HistoryItem } from "@/type/history";

// Per kunjungan maks sekian pencarian (katalog musik dibatasi ±20 request/menit per IP); sisanya kunjungan berikutnya
const LOOKUP_BATCH = 20;
// Sudah dicoba di tab ini → tidak diulang walau daftar dimuat ulang
const tried = new Set<string>();

/**
 * Cover & artis untuk Riwayat. Entri lama (sebelum cover/artis disimpan) dicari sekali di katalog musik lalu disimpan
 * ke server, dan ID gambar decal yang belum terbaca saat upload dilengkapi. Hasil: cover & artis per historyId.
 */
export function useHistoryCovers(items: HistoryItem[]) {
  const { lang } = useT();
  const dispatch = useAppDispatch();
  const apiKey = useAppSelector((s) => s.roblox.apiKey);
  const [found, setFound] = useState<Record<string, string | null>>({});
  const [artists, setArtists] = useState<Record<string, string | null>>({});

  // String primitif → efek jalan ulang hanya saat daftar yang perlu dilengkapi berubah
  const missing = useMemo(
    () =>
      items
        .filter((i) => (!i.cover || i.artist === undefined) && !tried.has(i.id))
        .slice(0, LOOKUP_BATCH)
        .map((i) => `${i.id}\t${i.title}\t${i.cover ? 1 : 0}`)
        .join("\n"),
    [items],
  );
  const noImage = useMemo(
    () =>
      apiKey
        ? items
            .filter((i) => i.cover?.decalId && !i.cover.imageId && !tried.has(`img:${i.id}`))
            .map((i) => `${i.id}\t${i.cover!.decalId}`)
            .join("\n")
        : "",
    [items, apiKey],
  );

  useEffect(() => {
    if (!missing) return;
    let alive = true;
    void (async () => {
      // Berurutan supaya tidak membanjiri katalog
      for (const line of missing.split("\n")) {
        const [id, title, hasCover] = line.split("\t");
        const meta = await findMeta(title, lang);
        if (!alive) return;
        // Katalog gagal dihubungi (mis. kena batas) → berhenti, coba lagi kunjungan berikutnya
        if (meta === undefined) return;
        tried.add(id);
        const artist = meta?.artist ?? null;
        setArtists((m) => ({ ...m, [id]: artist }));
        // Cover yang sudah ada (mis. hasil upload) tidak ditimpa
        if (hasCover === "1") {
          void saveHistoryMeta(id, { artist }).catch(() => tried.delete(id));
        } else {
          const url = meta?.cover ?? null;
          setFound((m) => ({ ...m, [id]: url }));
          void saveHistoryMeta(id, { cover: { url }, artist }).catch(() => tried.delete(id));
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [missing, lang]);

  useEffect(() => {
    if (!noImage || !apiKey) return;
    let alive = true;
    void (async () => {
      let changed = false;
      for (const line of noImage.split("\n")) {
        const [id, decalId] = line.split("\t");
        tried.add(`img:${id}`);
        const { imageId } = await fetchTextureId(apiKey, decalId).catch(() => ({ imageId: null }));
        if (!alive) return;
        if (imageId && (await saveHistoryCover(id, { imageId }).then(() => true, () => false))) changed = true;
      }
      if (changed && alive) dispatch(baseApi.util.invalidateTags(["History"]));
    })();
    return () => {
      alive = false;
    };
  }, [noImage, apiKey, dispatch]);

  return { covers: found, artists };
}

/** URL cover album sebuah entri (tersimpan atau baru ditemukan); null = pakai thumbnail video */
export const coverUrlOf = (item: HistoryItem, found: Record<string, string | null>) => item.cover?.url ?? found[item.id] ?? null;

/** Artis sebuah entri dari katalog (tersimpan atau baru ditemukan); null = tidak diketahui */
export const artistOf = (item: HistoryItem, found: Record<string, string | null>) => item.artist ?? found[item.id] ?? null;
