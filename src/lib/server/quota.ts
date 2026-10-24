import "server-only";
import { config } from "./config";
import { K, redis } from "./redis";
import { AppError } from "./http";
import type { Identity } from "./identity";
import type { QuotaInfo } from "@/type/auth";

// Kuota guest (default 3x) dihitung per cookie DAN per IP — ambil yang terbesar supaya
// hapus cookie / ganti browser tidak mereset kuota. User login: batas per jam saja.

const guestKeys = (id: Identity) => [K("quota", "g", id.guestId), K("quota", "ip", id.ipHash)];
const hourKey = (id: Identity) => K("rate", "u", id.user!.id, Math.floor(Date.now() / 3_600_000));

export async function getQuota(id: Identity): Promise<QuotaInfo> {
  const r = redis();
  if (id.user) {
    const used = Number((await r.get(hourKey(id))) ?? 0);
    return { limit: null, used, remaining: null, resetIn: null };
  }
  const [a, b] = guestKeys(id);
  const [ua, ub, ta, tb] = await Promise.all([r.get(a), r.get(b), r.ttl(a), r.ttl(b)]);
  const used = Math.max(Number(ua ?? 0), Number(ub ?? 0));
  const ttl = Math.max(ta, tb);
  return {
    limit: config.limits.guest,
    used,
    remaining: Math.max(0, config.limits.guest - used),
    resetIn: ttl > 0 ? ttl : null,
  };
}

/** Pakai 1 kuota. Lempar AppError kalau habis. */
export async function consumeQuota(id: Identity) {
  const r = redis();
  if (id.user) {
    const key = hourKey(id);
    const n = await r.incr(key);
    if (n === 1) await r.expire(key, 3600);
    if (n > config.limits.userHourly) {
      await r.decr(key);
      throw new AppError(`Batas ${config.limits.userHourly} convert per jam tercapai, coba lagi nanti`, 429, "RATE_LIMIT");
    }
    return;
  }

  // Increment dulu baru cek → request paralel tidak bisa lolos bersamaan
  const ttl = config.limits.guestWindowHours * 3600;
  const keys = guestKeys(id);
  const counts: number[] = [];
  for (const key of keys) {
    const n = await r.incr(key);
    if (n === 1 && ttl > 0) await r.expire(key, ttl);
    counts.push(n);
  }
  if (Math.max(...counts) > config.limits.guest) {
    for (const key of keys) await r.decr(key);
    throw new AppError("Kuota guest habis — masuk dengan Discord untuk lanjut convert", 403, "GUEST_LIMIT", {
      quota: await getQuota(id),
    });
  }
}

/** Kembalikan kuota kalau konversi gagal (bukan salah user) */
export async function refundQuota(owner: string, guestKeysSnapshot: string[] | null) {
  const r = redis();
  if (owner.startsWith("u:")) {
    const key = K("rate", "u", owner.slice(2), Math.floor(Date.now() / 3_600_000));
    if (Number((await r.get(key)) ?? 0) > 0) await r.decr(key);
    return;
  }
  for (const key of guestKeysSnapshot ?? []) {
    if (Number((await r.get(key)) ?? 0) > 0) await r.decr(key);
  }
}

export const guestKeySnapshot = (id: Identity) => (id.user ? null : guestKeys(id));
