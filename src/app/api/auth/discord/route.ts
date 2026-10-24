import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { config, discordEnabled } from "@/lib/server/config";
import { handle } from "@/lib/server/http";
import { K, setJson } from "@/lib/server/redis";
import { authorizeUrl } from "@/lib/server/discord";

// Mulai login Discord: simpan state (anti-CSRF) + tujuan setelah login, lalu redirect
export const GET = handle(async (req) => {
  if (!discordEnabled()) {
    return NextResponse.redirect(new URL("/login?error=discord_off", config.appUrl));
  }
  const nextParam = req.nextUrl.searchParams.get("next") ?? "/converter";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/converter";

  const state = randomBytes(16).toString("hex");
  await setJson(K("oauth", state), { next }, 600);
  return NextResponse.redirect(authorizeUrl(state));
});
