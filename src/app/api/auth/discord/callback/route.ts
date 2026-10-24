import { NextResponse, type NextRequest } from "next/server";
import { config } from "@/lib/server/config";
import { getJson, K, redis } from "@/lib/server/redis";
import { ensureMember, exchangeCode, fetchUser } from "@/lib/server/discord";
import { createSession, setSessionCookie } from "@/lib/server/identity";

const toLogin = (error: string) => NextResponse.redirect(new URL(`/login?error=${error}`, config.appUrl));

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error")) return toLogin("cancelled");
  if (!code || !state || !/^[a-f0-9]{32}$/.test(state)) return toLogin("invalid");
  if (req.cookies.get(config.cookies.oauthState)?.value !== state) return toLogin("invalid");

  const saved = await getJson<{ next: string }>(K("oauth", state));
  await redis().del(K("oauth", state));
  if (!saved) return toLogin("expired");

  try {
    const token = await exchangeCode(code);
    const user = await fetchUser(token);
    if (!(await ensureMember(token, user.id))) return toLogin("not_member");

    const session = await createSession(user);
    const res = NextResponse.redirect(new URL(saved.next, config.appUrl));
    setSessionCookie(res, session);
    res.cookies.set(config.cookies.oauthState, "", { path: "/api/auth/discord", maxAge: 0 });
    return res;
  } catch (e) {
    console.error("[discord]", e);
    return toLogin("failed");
  }
}
