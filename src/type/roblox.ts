import type { PermissionMode } from "./history";

export interface UploadForm {
  displayName: string;
  description: string;
  creatorType: "user" | "group";
  creatorId: string;
  permission: PermissionMode;
  placeId: string;
}

/** Alasan upload tidak bisa: belum login, API key belum diisi, atau format tidak didukung Roblox */
export type UploadBlock = "login" | "key" | "format" | null;

/** Audio di library "Audio saya" (dari inventory / asset ID manual) */
export interface LibraryAsset {
  assetId: string;
  name: string | null;
  state: "Processing" | "Reviewing" | "Approved" | "Rejected" | "Failed" | null;
  creatorType: "user" | "group" | null;
  creatorId: string | null;
  archived: boolean;
  error: string | null;
}

/** Hasil izin per aset di library */
export type GrantStatus = { status: "granted" } | { status: "failed"; message: string };

/** Profil publik Roblox (user / grup) — kartu akun di Pengaturan */
export interface RobloxProfile {
  type: "user" | "group";
  id: string;
  name: string;
  displayName: string;
  verified: boolean;
  avatarUrl: string | null;
  bodyUrl: string | null;
  created: string | null;
  memberCount: number | null;
  owner: string | null;
}
