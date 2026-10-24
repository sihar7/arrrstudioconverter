import "server-only";
import { AppError } from "./http";
import { K, redis } from "./redis";

/** Fixed-window rate limit per kunci (Redis, lintas instance). INCR + EXPIRE atomik → kunci tidak pernah abadi */
export async function rateLimit(name: string, who: string, max: number, windowSec: number) {
  const windowMs = windowSec * 1000;
  const bucket = Math.floor(Date.now() / windowMs);
  const key = K("rl", name, who, bucket);
  const res = await redis().multi().incr(key).expire(key, windowSec).exec();
  const n = Number(res?.[0]?.[1] ?? 0);
  if (n > max) {
    const retryAfter = Math.max(1, Math.ceil(((bucket + 1) * windowMs - Date.now()) / 1000));
    throw new AppError("Terlalu banyak permintaan, tunggu sebentar", 429, "RATE_LIMIT", { retryAfter });
  }
}
