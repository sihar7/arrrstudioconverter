import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { config } from "./config";
import { getJson, K, redis, setJson } from "./redis";
import { AppError } from "./http";
import type { SessionUser } from "@/type/auth";

// Identitas request: user Discord (sesi di Redis) atau guest (cookie acak + hash IP)

export interface Identity {
  user: SessionUser | null;
  guestId: string;
  newGuest: boolean;
  ipHash: string;
  /** Pemilik file/job: "u:<discordId>" atau "g:<guestId>" */
  owner: string;
}

const SESSION_TTL = config.cookies.sessionDays * 86400;

function clientIp(req: NextRequest) {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || req.headers.get("x-real-ip") || "local").trim();
}

export async function identify(req: NextRequest): Promise<Identity> {
  const sid = req.cookies.get(config.cookies.session)?.value;
  let user: SessionUser | null = null;
  if (sid && /^[a-f0-9]{64}$/.test(sid)) {
    user = await getJson<SessionUser>(K("sess", sid));
  }

  let guestId = req.cookies.get(config.cookies.guest)?.value ?? "";
  const newGuest = !/^[a-f0-9]{32}$/.test(guestId);
  if (newGuest) guestId = randomBytes(16).toString("hex");

  const ipHash = createHash("sha256").update(clientIp(req)).digest("hex").slice(0, 24);
  return { user, guestId, newGuest, ipHash, owner: user ? `u:${user.id}` : `g:${guestId}` };
}

export async function requireUser(req: NextRequest): Promise<Identity & { user: SessionUser }> {
  const id = await identify(req);
  if (!id.user) throw new AppError("Masuk dengan Discord dulu", 401, "AUTH_REQUIRED");
  return id as Identity & { user: SessionUser };
}

/** Pasang cookie guest kalau baru dibuat */
export function attachGuest<T extends NextResponse>(res: T, id: Identity): T {
  if (id.newGuest) {
    res.cookies.set(config.cookies.guest, id.guestId, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.isProd,
      path: "/",
      maxAge: 365 * 86400,
    });
  }
  return res;
}

export async function createSession(user: SessionUser) {
  const sid = randomBytes(32).toString("hex");
  await setJson(K("sess", sid), user, SESSION_TTL);
  return sid;
}

export function setSessionCookie(res: NextResponse, sid: string) {
  res.cookies.set(config.cookies.session, sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProd,
    path: "/",
    maxAge: SESSION_TTL,
  });
}

export async function destroySession(req: NextRequest, res: NextResponse) {
  const sid = req.cookies.get(config.cookies.session)?.value;
  if (sid && /^[a-f0-9]{64}$/.test(sid)) await redis().del(K("sess", sid));
  res.cookies.set(config.cookies.session, "", { path: "/", maxAge: 0 });
}
