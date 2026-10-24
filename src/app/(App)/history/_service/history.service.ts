import { apiFetch } from "@/lib/utils";
import type { HistoryEntry } from "@/type/history";
import type { UploadForm } from "@/type/roblox";

export function checkStatus(apiKey: string, historyIds: string[]) {
  return apiFetch<{ entries: HistoryEntry[]; errors: Record<string, string> }>("/api/roblox/status", {
    method: "POST",
    json: { apiKey, historyIds },
  });
}

export function applyPermission(apiKey: string, entry: HistoryEntry, mode: "place" | "public", placeId?: string) {
  return apiFetch<{ entry: HistoryEntry }>("/api/roblox/permission", {
    method: "POST",
    json: { apiKey, historyId: entry.id, assetIds: [entry.roblox!.assetId], mode, placeId },
  });
}

export function applyPermissionMany(apiKey: string, historyIds: string[], mode: "place" | "public", placeId?: string) {
  return apiFetch<{ entries: HistoryEntry[] }>("/api/roblox/permission", {
    method: "POST",
    json: { apiKey, historyIds, assetIds: ["0"], mode, placeId },
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
