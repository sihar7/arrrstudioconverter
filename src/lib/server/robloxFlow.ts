import "server-only";
import { grantPermission, moderationState } from "./roblox";
import { getHistory, updateHistory } from "./history";
import type { HistoryEntry, RobloxPermissionRecord } from "@/type/history";

// Terapkan izin yang masih "pending" ke aset di riwayat (setelah asset ID tersedia)

export async function applyPendingPermissions(apiKey: string, uid: string, historyId: string): Promise<HistoryEntry> {
  const entry = await getHistory(uid, historyId);
  const rb = entry.roblox;
  if (!rb?.assetId) return entry;

  // Publik (Creator Store) hanya bisa setelah audio lolos review → tunda sampai Approved, jangan langsung gagal
  const needsApproval = rb.permissions.some((p) => p.status === "pending" && p.mode === "public");
  const approved = needsApproval ? (await moderationState(apiKey, rb.assetId).catch(() => rb.state)) === "Approved" : true;

  const results: RobloxPermissionRecord[] = [];
  for (const p of rb.permissions) {
    if (p.status !== "pending") {
      results.push(p);
      continue;
    }
    if (p.mode === "public" && !approved) {
      results.push({ ...p, message: "Otomatis jadi publik setelah audio Disetujui Roblox" });
      continue;
    }
    try {
      const target = p.mode === "place" ? { mode: "place" as const, placeId: p.placeId! } : { mode: "public" as const };
      const r = await grantPermission(apiKey, [rb.assetId], target);
      const failed = r.failed[rb.assetId];
      results.push({ ...p, universeId: r.universeId, status: failed ? "failed" : "granted", message: failed ?? null });
    } catch (e) {
      results.push({ ...p, status: "failed", message: (e as Error).message });
    }
  }
  return updateHistory(uid, historyId, (e) => ({ ...e, roblox: e.roblox && { ...e.roblox, permissions: results } }));
}

/** Tambahkan izin baru ke catatan (status pending) — menggantikan izin mode+place yang sama */
export function withPermission(
  entry: HistoryEntry,
  mode: "place" | "public",
  placeId: string | null,
): HistoryEntry {
  if (!entry.roblox) return entry;
  const rest = entry.roblox.permissions.filter((p) => !(p.mode === mode && p.placeId === placeId));
  return {
    ...entry,
    roblox: {
      ...entry.roblox,
      permissions: [...rest, { mode, placeId, universeId: null, status: "pending", message: null }],
    },
  };
}
