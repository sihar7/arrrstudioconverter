import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config";
import { AppError } from "./http";

// JWT HS256 minimal (tanpa dependensi) — dipakai untuk cookie sesi.
// Token hanya membawa id sesi; data user tetap di Redis supaya logout / cabut sesi langsung berlaku.

export interface JwtClaims {
  sub: string;
  sid: string;
  iat: number;
  exp: number;
}

const b64 = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");
const HEADER = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));

let key: Buffer | null = null;
function secret(): Buffer {
  if (key) return key;
  if (config.jwtSecret) key = Buffer.from(config.jwtSecret);
  // Fallback: turunan dari secret Discord (tetap rahasia server) — sebaiknya isi JWT_SECRET sendiri
  else if (config.discord.clientSecret) key = createHash("sha256").update(`arrc-jwt:${config.discord.clientSecret}`).digest();
  else if (!config.isProd) key = Buffer.from("arrc-dev-only-secret");
  else throw new AppError("Server belum dikonfigurasi: JWT_SECRET wajib diisi di production", 503, "JWT_MISSING");
  return key;
}

const sign = (data: string) => createHmac("sha256", secret()).update(data).digest();

export function signJwt(claims: Omit<JwtClaims, "iat" | "exp">, ttlSec: number): string {
  const now = Math.floor(Date.now() / 1000);
  const body = `${HEADER}.${b64(JSON.stringify({ ...claims, iat: now, exp: now + ttlSec }))}`;
  return `${body}.${b64(sign(body))}`;
}

/** Valid → klaim; tanda tangan salah / kedaluwarsa / format rusak → null */
export function verifyJwt(token: string | undefined): JwtClaims | null {
  if (!token || token.length > 1024) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== HEADER) return null;
  const expected = sign(`${parts[0]}.${parts[1]}`);
  const got = Buffer.from(parts[2], "base64url");
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;
  try {
    const c = JSON.parse(Buffer.from(parts[1], "base64url").toString()) as JwtClaims;
    if (typeof c.sid !== "string" || typeof c.sub !== "string" || typeof c.exp !== "number") return null;
    return c.exp > Date.now() / 1000 ? c : null;
  } catch {
    return null;
  }
}
