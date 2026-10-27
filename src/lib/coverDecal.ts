// Cover lagu → Decal Roblox (dipakai Converter & Riwayat) + simpan cover ke entri riwayat,
// supaya cover & ID-nya tampil di Riwayat dan ikut ekspor (Nama · Asset ID · Cover ID).

import { apiFetch } from "./utils";
import { coverDataUrl, type CoverStyle } from "./trackMeta";
import { checkOperation, fetchTextureId, uploadDecal } from "@/app/(App)/skybox/_service/skybox.service";
import type { HistoryCover } from "@/type/history";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface CoverUpload {
  apiKey: string;
  creatorType: "user" | "group";
  creatorId: string;
  displayName: string;
  /** URL cover album; null = potongan kotak thumbnail video */
  cover: string | null;
  videoId: string;
  /** Bahan cover otomatis: judul lagu & artis */
  title: string;
  artist: string | null;
  style: CoverStyle;
}

export type CoverStage = { status: "processing" } | { status: "decal"; decalId: string };

/**
 * Upload cover sebagai Decal → tunggu asset ID → baca ID gambar di baliknya.
 * imageId null = Roblox masih memproses (decalId tetap valid, bisa dibaca ulang nanti).
 */
export async function uploadCoverDecal(
  body: CoverUpload,
  onStage: (s: CoverStage) => void = () => {},
  alive: () => boolean = () => true,
): Promise<{ decalId: string; imageId: string | null }> {
  let res = await uploadDecal({
    apiKey: body.apiKey,
    creatorType: body.creatorType,
    creatorId: body.creatorId,
    displayName: body.displayName.trim().slice(0, 50) || "Cover",
    image: await coverDataUrl(body.cover, body.videoId, { style: body.style, text: { title: body.title, artist: body.artist } }),
  });
  onStage({ status: "processing" });
  for (let i = 0; !res.assetId && res.operationId && i < 30 && alive(); i++) {
    await sleep(2000);
    res = await checkOperation(body.apiKey, res.operationId);
  }
  if (!res.assetId) throw new Error("timeout");
  const decalId = res.assetId;
  onStage({ status: "decal", decalId });
  // Roblox butuh beberapa detik sebelum ID gambar di balik decal bisa dibaca
  for (let i = 0; i < 12 && alive(); i++) {
    const { imageId } = await fetchTextureId(body.apiKey, decalId).catch(() => ({ imageId: null }));
    if (imageId) return { decalId, imageId };
    await sleep(3000);
  }
  return { decalId, imageId: null };
}

/** Simpan sebagian data cover ke entri riwayat (merge di server) */
export const saveHistoryCover = (historyId: string, cover: Partial<HistoryCover>) =>
  apiFetch<{ cover: HistoryCover }>(`/api/history/${historyId}`, { method: "PATCH", json: { cover } });

/** ID yang dipakai di Roblox: ID gambar (ImageLabel), atau ID decal bila belum terbaca */
export const coverAssetId = (c: HistoryCover | null | undefined) => c?.imageId ?? c?.decalId ?? null;
