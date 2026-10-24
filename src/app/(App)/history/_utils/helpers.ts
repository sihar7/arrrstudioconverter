import type { HistoryItem, ModerationState } from "@/type/history";

export type HistoryFilter = "all" | "uploaded" | "local";

export function filterHistory(items: HistoryItem[], filter: HistoryFilter, query: string) {
  const q = query.trim().toLowerCase();
  return items.filter((i) => {
    if (filter === "uploaded" && !i.roblox) return false;
    if (filter === "local" && i.roblox) return false;
    if (!q) return true;
    return i.title.toLowerCase().includes(q) || (i.roblox?.assetId ?? "").includes(q) || i.videoId.toLowerCase().includes(q);
  });
}

export const stateTone = (s: ModerationState) =>
  s === "Approved" ? "ok" : s === "Rejected" || s === "Failed" ? "err" : s === "Reviewing" ? "warn" : "neutral";

/** Item yang statusnya masih bisa berubah (perlu dicek ulang) */
export const needsCheck = (i: HistoryItem) =>
  Boolean(
    i.roblox &&
      (i.roblox.state === "Processing" || i.roblox.state === "Reviewing" || i.roblox.permissions.some((p) => p.status === "pending")),
  );

/** Sudah di Roblox tapi belum publik (atau publiknya gagal) → kandidat "Jadikan publik" massal */
export const canGoPublic = (i: HistoryItem) =>
  Boolean(i.roblox?.assetId && !i.roblox.permissions.some((p) => p.mode === "public" && p.status === "granted"));
