import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

// Error yang pesannya aman ditampilkan ke user
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "BAD_REQUEST",
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json(data, init);

export function fail(err: unknown) {
  if (err instanceof AppError) {
    const retry = err.extra.retryAfter;
    return NextResponse.json(
      { error: err.message, code: err.code, ...err.extra },
      { status: err.status, headers: typeof retry === "number" ? { "Retry-After": String(retry) } : undefined },
    );
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return NextResponse.json(
      { error: `Input tidak valid: ${first?.path.join(".") || "body"} — ${first?.message}`, code: "VALIDATION" },
      { status: 422 },
    );
  }
  console.error("[api]", err);
  return NextResponse.json({ error: "Terjadi kesalahan di server", code: "INTERNAL" }, { status: 500 });
}

export function clientIp(req: NextRequest) {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || req.headers.get("x-real-ip") || "local").trim();
}

// ============================================================
// THROTTLE per IP (token bucket di memori instance) — rem pertama untuk semua /api, tanpa biaya Redis.
// Batas per fitur yang ketat tetap di rateLimit() (Redis, berlaku lintas instance).
// ============================================================
const BUCKET = { capacity: 90, refillPerSec: 3 };
const buckets = new Map<string, { tokens: number; at: number }>();

function throttle(ip: string) {
  const now = Date.now();
  const b = buckets.get(ip) ?? { tokens: BUCKET.capacity, at: now };
  b.tokens = Math.min(BUCKET.capacity, b.tokens + ((now - b.at) / 1000) * BUCKET.refillPerSec);
  b.at = now;
  if (b.tokens < 1) {
    buckets.set(ip, b);
    throw new AppError("Terlalu banyak permintaan, pelan-pelan dulu", 429, "THROTTLED", {
      retryAfter: Math.ceil((1 - b.tokens) / BUCKET.refillPerSec),
    });
  }
  b.tokens -= 1;
  buckets.set(ip, b);
  // Cegah map membengkak: buang bucket yang sudah penuh lagi (idle)
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.tokens + ((now - v.at) / 1000) * BUCKET.refillPerSec >= BUCKET.capacity) buckets.delete(k);
  }
}

/** Anti-CSRF: request yang mengubah data harus dari origin yang sama */
function sameOrigin(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return;
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") throw new AppError("Permintaan lintas situs ditolak", 403, "CSRF");
  const origin = req.headers.get("origin");
  if (origin) {
    let host = "";
    try {
      host = new URL(origin).host;
    } catch {}
    if (host !== (req.headers.get("x-forwarded-host") || req.headers.get("host"))) {
      throw new AppError("Permintaan lintas situs ditolak", 403, "CSRF");
    }
  }
}

/** Bungkus route handler: throttle + cek origin, semua error → JSON {error, code} */
export function handle<C = unknown>(fn: (req: NextRequest, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C) => {
    try {
      throttle(clientIp(req));
      sameOrigin(req);
      return await fn(req, ctx);
    } catch (e) {
      return fail(e);
    }
  };
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError("Body harus JSON", 400);
  }
}
