import "server-only";
import { randomBytes } from "node:crypto";
import { config } from "./config";
import { AppError } from "./http";
import { K, redis } from "./redis";
import { fileExists } from "./storage";
import type { HistoryEntry, HistoryItem } from "@/type/history";

// Riwayat per user Discord: hash (id → JSON) + sorted set (urutan waktu). Dibatasi historyMax.

const hKey = (uid: string) => K("hist", uid);
const zKey = (uid: string) => K("histz", uid);

export const newHistoryId = () => randomBytes(8).toString("hex");

export async function addHistory(uid: string, entry: HistoryEntry) {
  const r = redis();
  await r.hset(hKey(uid), entry.id, JSON.stringify(entry));
  await r.zadd(zKey(uid), entry.createdAt, entry.id);

  const total = await r.zcard(zKey(uid));
  if (total > config.limits.historyMax) {
    const old = await r.zrange(zKey(uid), 0, total - config.limits.historyMax - 1);
    if (old.length) {
      await r.hdel(hKey(uid), ...old);
      await r.zrem(zKey(uid), ...old);
    }
  }
}

export async function getHistory(uid: string, id: string): Promise<HistoryEntry> {
  const raw = await redis().hget(hKey(uid), id);
  if (!raw) throw new AppError("Riwayat tidak ditemukan", 404, "NOT_FOUND");
  return JSON.parse(raw) as HistoryEntry;
}

export async function updateHistory(uid: string, id: string, patch: (e: HistoryEntry) => HistoryEntry) {
  const next = patch(await getHistory(uid, id));
  await redis().hset(hKey(uid), id, JSON.stringify(next));
  return next;
}

export async function listHistory(uid: string): Promise<HistoryItem[]> {
  const ids = await redis().zrevrange(zKey(uid), 0, config.limits.historyMax - 1);
  if (!ids.length) return [];
  const raws = await redis().hmget(hKey(uid), ...ids);
  const entries = raws.filter((r): r is string => Boolean(r)).map((r) => JSON.parse(r) as HistoryEntry);
  const now = Date.now();
  return Promise.all(
    entries.map(async (e) => ({
      ...e,
      fileAvailable: e.fileExpiresAt > now && (await fileExists(e.fileId)),
    })),
  );
}

export async function removeHistory(uid: string, id: string) {
  await redis().hdel(hKey(uid), id);
  await redis().zrem(zKey(uid), id);
}

export async function clearHistory(uid: string) {
  await redis().del(hKey(uid), zKey(uid));
}
