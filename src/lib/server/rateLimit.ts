import "server-only";
import { AppError } from "./http";
import { K, redis } from "./redis";

/** Fixed-window rate limit sederhana per kunci */
export async function rateLimit(name: string, who: string, max: number, windowSec: number) {
  const bucket = Math.floor(Date.now() / (windowSec * 1000));
  const key = K("rl", name, who, bucket);
  const n = await redis().incr(key);
  if (n === 1) await redis().expire(key, windowSec);
  if (n > max) throw new AppError("Terlalu banyak permintaan, tunggu sebentar", 429, "RATE_LIMIT");
}
