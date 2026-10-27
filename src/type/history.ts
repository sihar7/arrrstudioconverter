import type { AudioFormat, AudioOptions } from "@/lib/schemas/convert.schema";

export type ModerationState = "Processing" | "Reviewing" | "Approved" | "Rejected" | "Failed";
export type PermissionMode = "none" | "place" | "public";

export interface RobloxPermissionRecord {
  mode: Exclude<PermissionMode, "none">;
  placeId: string | null;
  universeId: string | null;
  status: "pending" | "granted" | "failed";
  message: string | null;
}

export interface RobloxRecord {
  assetId: string | null;
  operationId: string | null;
  displayName: string;
  creatorType: "user" | "group";
  creatorId: string;
  state: ModerationState;
  error: string | null;
  permissions: RobloxPermissionRecord[];
  uploadedAt: number;
  checkedAt: number | null;
}

/**
 * Cover lagu. url = cover album (iTunes), null = tidak ketemu → pakai thumbnail video.
 * decalId/imageId = hasil upload sebagai Decal; imageId = ID gambar di baliknya (yang dipakai ImageLabel).
 */
export interface HistoryCover {
  url: string | null;
  decalId: string | null;
  imageId: string | null;
}

export interface HistoryEntry {
  id: string;
  createdAt: number;
  videoId: string;
  title: string;
  thumbnail: string;
  format: AudioFormat;
  size: number;
  duration: number;
  options: AudioOptions;
  fileId: string;
  fileExpiresAt: number;
  roblox: RobloxRecord | null;
  cover?: HistoryCover | null;
  /** "file" = diupload dari perangkat user (videoId & thumbnail kosong); tidak ada = hasil convert YouTube */
  source?: "file";
}

export interface HistoryItem extends HistoryEntry {
  fileAvailable: boolean;
}
