import { apiFetch } from "@/lib/utils";
import type { HistoryEntry } from "@/type/history";
import type { UploadForm } from "@/type/roblox";

export function checkStatus(apiKey: string, historyIds: string[]) {
  return apiFetch<{ entries: HistoryEntry[]; errors: Record<string, string> }>("/api/roblox/status", {
    method: "POST",
    json: { apiKey, historyIds },
  });
}

/** place = Place ID · group = komunitas (ID grup) · public = semua game */
export type GrantMode = "place" | "public" | "group";

/** `target` = Place ID (place) atau ID komunitas (group) */
const targetOf = (mode: GrantMode, target?: string) => (mode === "place" ? { placeId: target } : mode === "group" ? { groupId: target } : {});

export function applyPermission(apiKey: string, entry: HistoryEntry, mode: GrantMode, target?: string) {
  return apiFetch<{ entry: HistoryEntry }>("/api/roblox/permission", {
    method: "POST",
    json: { apiKey, historyId: entry.id, assetIds: [entry.roblox!.assetId], mode, ...targetOf(mode, target) },
  });
}

export function applyPermissionMany(apiKey: string, historyIds: string[], mode: GrantMode, target?: string) {
  return apiFetch<{ entries: HistoryEntry[] }>("/api/roblox/permission", {
    method: "POST",
    json: { apiKey, historyIds, assetIds: ["0"], mode, ...targetOf(mode, target) },
  });
}

export function uploadEntry(apiKey: string, entry: HistoryEntry, form: UploadForm) {
  return apiFetch<{ assetId: string | null; operationId: string | null }>("/api/roblox/upload", {
    method: "POST",
    json: {
      fileId: entry.fileId,
      historyId: entry.id,
      apiKey,
      creatorType: form.creatorType,
      creatorId: form.creatorId,
      displayName: form.displayName.trim().slice(0, 50) || "Audio",
      description: form.description,
      permission: form.permission,
      placeId: form.permission === "place" ? form.placeId : undefined,
    },
  });
}

/** Hapus banyak riwayat; archive + apiKey → aset yang sudah diupload ikut diarsipkan di Roblox */
export function deleteMany(ids: string[], archive: boolean, apiKey?: string, files = false) {
  return apiFetch<{ deleted: number; archived: number; archiveFailed: number; failed: Record<string, string> }>("/api/history/delete", {
    method: "POST",
    json: { ids, archive, apiKey: archive ? apiKey : undefined, files },
  });
}
