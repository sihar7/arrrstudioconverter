export const SPOOF_KINDS = ["animation", "audio", "image", "mesh", "model", "video"] as const;
export type SpoofKind = (typeof SPOOF_KINDS)[number];
/** Jenis yang diminta: "auto" = deteksi dari isi file */
export type SpoofWant = SpoofKind | "auto";

export interface SpoofPermission {
  mode: "place" | "public";
  placeId: string | null;
  status: "pending" | "granted" | "failed";
  message: string | null;
}

/** Pembuat aset sumber (user / grup) — null kalau Roblox tidak memberi info */
export interface SpoofSourceCreator {
  type: "user" | "group";
  id: string;
  name: string | null;
}

export interface SpoofRecord {
  id: string;
  createdAt: number;
  kind: SpoofKind;
  sourceId: string;
  name: string;
  /** pembuat aset sumber (catatan lama: tidak ada) */
  sourceCreator?: SpoofSourceCreator | null;
  /** ukuran file sumber dalam byte */
  sizeBytes?: number;
  /** lama proses download (+ upload) dalam ms */
  durationMs?: number;
  /** tujuan upload ulang (akun / grup pemilik API key) */
  creatorType: "user" | "group";
  creatorId: string;
  /** asset ID baru (null selama Roblox masih memproses / tidak di-upload otomatis) */
  assetId: string | null;
  operationId: string | null;
  /** file .rbxm / audio sumber untuk import manual di Studio */
  fileId: string | null;
  error: string | null;
  permission: SpoofPermission | null;
}
