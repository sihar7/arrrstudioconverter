import "server-only";
import Redis from "ioredis";
import RedisMock from "ioredis-mock";
import { config } from "./config";

// Satu koneksi per proses (disimpan di globalThis agar tidak bocor saat HMR dev)
const g = globalThis as unknown as { __arrcRedis?: Redis };

export const K = (...parts: (string | number)[]) => ["arrc", ...parts].join(":");

export function redis(): Redis {
  if (g.__arrcRedis) return g.__arrcRedis;

  if (config.redisUrl) {
    const client = new Redis(config.redisUrl, { maxRetriesPerRequest: 2, enableReadyCheck: true });
    client.on("error", (e) => console.error("[redis]", e.message));
    g.__arrcRedis = client;
  } else {
    if (config.isProd) {
      throw new Error("REDIS_URL wajib diisi di production");
    }
    console.warn("[redis] REDIS_URL kosong — memakai Redis memori (dev saja, data hilang saat restart)");
    g.__arrcRedis = new RedisMock() as unknown as Redis;
  }
  return g.__arrcRedis;
}

export async function getJson<T>(key: string): Promise<T | null> {
  const raw = await redis().get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJson(key: string, value: unknown, ttlSec?: number) {
  const raw = JSON.stringify(value);
  if (ttlSec && ttlSec > 0) await redis().set(key, raw, "EX", ttlSec);
  else await redis().set(key, raw);
}
