import type { HistoryItem, ModerationState } from "@/type/history";
import type { Dictionary } from "@/utils/languages/id";
import { fmt } from "@/utils/i18n";

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

const DAY = 86_400_000;
const startOfDay = (ts: number) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Label grup per hari: Hari ini · Kemarin · tanggal (lokal) */
export function dayLabel(ts: number, t: Dictionary, lang: string) {
  const diff = Math.round((startOfDay(Date.now()) - startOfDay(ts)) / DAY);
  if (diff === 0) return t.history.today;
  if (diff === 1) return t.history.yesterday;
  return new Date(ts).toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** Kelompokkan item (sudah urut terbaru) per hari, urutan tetap */
export function groupByDay(items: HistoryItem[]) {
  const groups: { day: number; items: HistoryItem[] }[] = [];
  for (const i of items) {
    const day = startOfDay(i.createdAt);
    const last = groups.at(-1);
    if (last?.day === day) last.items.push(i);
    else groups.push({ day, items: [i] });
  }
  return groups;
}

/** "baru saja" / "5 mnt lalu" / "3 jam lalu" / jam (hari lain) */
export function relTime(ts: number, t: Dictionary) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return t.time.justNow;
  if (s < 3600) return fmt(t.time.minutes, { n: Math.floor(s / 60) });
  if (s < DAY / 1000) return fmt(t.time.hours, { n: Math.floor(s / 3600) });
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export type QuickSelect = "all" | "expired" | "local" | "rejected";

export const quickMatch: Record<QuickSelect, (i: HistoryItem) => boolean> = {
  all: () => true,
  expired: (i) => !i.fileAvailable,
  local: (i) => !i.roblox,
  rejected: (i) => i.roblox?.state === "Rejected" || i.roblox?.state === "Failed",
};
