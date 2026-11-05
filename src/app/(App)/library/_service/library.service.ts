import { apiFetch } from "@/lib/utils";
import type { LibraryAsset } from "@/type/roblox";

export interface LibraryQuery {
  apiKey: string;
  creatorType: "user" | "group";
  creatorId: string;
  pageToken?: string;
  assetIds?: string[];
}

export function fetchLibrary(body: LibraryQuery) {
  return apiFetch<{ assets: LibraryAsset[]; nextPageToken: string | null }>("/api/roblox/library", { method: "POST", json: body });
}

/**
 * Izinkan di place tertentu, komunitas (Group ID), publik audio (distribusi gratis di Creator Store),
 * atau Open Use (gambar/decal/mesh bisa dipakai game mana pun tanpa izin — permanen)
 */
export function grantAccess(apiKey: string, assetIds: string[], mode: "place" | "public" | "group" | "open", targetId?: string) {
  return apiFetch<{ granted: string[]; failed: Record<string, string>; universeId: string | null }>("/api/roblox/permission", {
    method: "POST",
    json: { apiKey, assetIds, mode, ...(mode === "group" ? { groupId: targetId } : mode === "place" ? { placeId: targetId } : {}) },
  });
}

export function archiveAssets(apiKey: string, assetIds: string[], archive: boolean) {
  return apiFetch<{ done: string[]; failed: Record<string, string> }>("/api/roblox/archive", {
    method: "POST",
    json: { apiKey, assetIds, archive },
  });
}

/** "123, 456\n789" → ["123","456","789"] (unik, maks 50) */
export function parseIds(text: string): string[] {
  return [...new Set(text.match(/\d{5,20}/g) ?? [])].slice(0, 50);
}
