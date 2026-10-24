import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { config, discordEnabled } from "@/lib/server/config";
import { clientIp, handle } from "@/lib/server/http";
import { K, setJson } from "@/lib/server/redis";
import { authorizeUrl } from "@/lib/server/discord";
import { rateLimit } from "@/lib/server/rateLimit";

// Mulai login Discord: simpan state (anti-CSRF) + tujuan setelah login, lalu redirect
export const GET = handle(async (req) => {
  if (!discordEnabled()) {
    return NextResponse.redirect(new URL("/login?error=discord_off", config.appUrl));
  }
  await rateLimit("login", clientIp(req), 20, 600);
  const nextParam = req.nextUrl.searchParams.get("next") ?? "/converter";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/converter";

  const state = randomBytes(16).toString("hex");
  await setJson(K("oauth", state), { next }, 600);
  const res = NextResponse.redirect(authorizeUrl(state));
  // State juga disimpan di cookie browser ini → callback dari browser lain (login CSRF) ditolak
  res.cookies.set(config.cookies.oauthState, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProd,
    path: "/api/auth/discord",
    maxAge: 600,
  });
  return res;
});
