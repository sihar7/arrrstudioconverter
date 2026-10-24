import "server-only";
import { randomBytes } from "node:crypto";
import { config } from "./config";
import { AppError } from "./http";
import { K, redis } from "./redis";
import type { SpoofRecord } from "@/type/spoof";

// Riwayat spoof per user: hash (id → JSON) + sorted set (urutan waktu), dibatasi historyMax.

const hKey = (uid: string) => K("spoof", uid);
const zKey = (uid: string) => K("spoofz", uid);

export const newSpoofId = () => randomBytes(8).toString("hex");

export async function addSpoof(uid: string, rec: SpoofRecord) {
  const r = redis();
  await r.hset(hKey(uid), rec.id, JSON.stringify(rec));
  await r.zadd(zKey(uid), rec.createdAt, rec.id);
  const total = await r.zcard(zKey(uid));
  if (total > config.limits.historyMax) {
    const old = await r.zrange(zKey(uid), 0, total - config.limits.historyMax - 1);
    if (old.length) {
      await r.hdel(hKey(uid), ...old);
      await r.zrem(zKey(uid), ...old);
    }
  }
}

export async function getSpoof(uid: string, id: string): Promise<SpoofRecord> {
  const raw = await redis().hget(hKey(uid), id);
  if (!raw) throw new AppError("Riwayat spoof tidak ditemukan", 404, "NOT_FOUND");
  return JSON.parse(raw) as SpoofRecord;
}

export async function updateSpoof(uid: string, id: string, patch: (r: SpoofRecord) => SpoofRecord) {
  const next = patch(await getSpoof(uid, id));
  await redis().hset(hKey(uid), id, JSON.stringify(next));
  return next;
}

export async function listSpoof(uid: string): Promise<SpoofRecord[]> {
  const ids = await redis().zrevrange(zKey(uid), 0, config.limits.historyMax - 1);
  if (!ids.length) return [];
  const raws = await redis().hmget(hKey(uid), ...ids);
  return raws.filter((r): r is string => Boolean(r)).map((r) => JSON.parse(r) as SpoofRecord);
}

export async function clearSpoof(uid: string) {
  await redis().del(hKey(uid), zKey(uid));
}
