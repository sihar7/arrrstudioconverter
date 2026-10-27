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

/** Izinkan di place tertentu, atau publik (distribusi gratis di Creator Store) */
export function grantAccess(apiKey: string, assetIds: string[], mode: "place" | "public", placeId?: string) {
  return apiFetch<{ granted: string[]; failed: Record<string, string>; universeId: string | null }>("/api/roblox/permission", {
    method: "POST",
    json: { apiKey, assetIds, mode, placeId },
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
