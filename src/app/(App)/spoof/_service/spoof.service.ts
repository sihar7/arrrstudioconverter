import { apiFetch } from "@/lib/utils";
import type { PermissionMode } from "@/type/history";
import type { SpoofKind, SpoofRecord } from "@/type/spoof";

// Spoof audio / animasi lewat backend (/api/spoof). API key hanya diteruskan, tidak disimpan server.

export interface SpoofRequest {
  apiKey: string;
  kind: SpoofKind;
  sourceId: string;
  autoUpload: boolean;
  creatorType: "user" | "group";
  creatorId: string;
  permission: PermissionMode;
  placeId?: string;
}

export const runSpoof = (body: SpoofRequest) => apiFetch<{ item: SpoofRecord }>("/api/spoof", { method: "POST", json: body }).then((r) => r.item);

export const listSpoofs = () => apiFetch<{ items: SpoofRecord[] }>("/api/spoof", { cache: "no-store" }).then((r) => r.items);

export const clearSpoofs = () => apiFetch<{ ok: true }>("/api/spoof", { method: "DELETE" });

export const refreshSpoof = (id: string, apiKey: string) =>
  apiFetch<{ item: SpoofRecord }>(`/api/spoof/${id}`, { method: "POST", json: { apiKey } }).then((r) => r.item);

/** Asset ID dari teks bebas: angka polos atau link Roblox (…/library/123/…, rbxassetid://123, ?id=123) */
export function parseAssetIds(text: string, max: number): string[] {
  const ids = new Set<string>();
  for (const m of text.matchAll(/(?:^|[^\d])(\d{5,20})(?=[^\d]|$)/g)) {
    ids.add(m[1]);
    if (ids.size >= max) break;
  }
  return [...ids];
}
