import "server-only";
import Url from "@/Url/Url";
import { config } from "./config";
import { AppError } from "./http";
import type { SessionUser } from "@/type/auth";

// Discord OAuth2 (authorization code). Opsional: wajib member server (DISCORD_GUILD_ID),
// dan kalau ada DISCORD_BOT_TOKEN user yang belum join otomatis dimasukkan ke server.

const d = config.discord;

export function scopes() {
  const s = ["identify"];
  if (d.guildId) s.push(d.botToken ? "guilds.join" : "guilds.members.read");
  return s;
}

export function authorizeUrl(state: string) {
  const p = new URLSearchParams({
    client_id: d.clientId,
    redirect_uri: d.redirectUri,
    response_type: "code",
    scope: scopes().join(" "),
    state,
    prompt: "none",
  });
  return `${Url.discordAuthorize}?${p}`;
}

export async function exchangeCode(code: string): Promise<string> {
  const res = await fetch(`${Url.discordApi}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: d.clientId,
      client_secret: d.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: d.redirectUri,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string };
  if (!res.ok || !json.access_token) throw new AppError("Login Discord gagal, coba lagi", 400, "DISCORD");
  return json.access_token;
}

export async function fetchUser(token: string): Promise<SessionUser> {
  const res = await fetch(`${Url.discordApi}/users/@me`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new AppError("Gagal membaca profil Discord", 400, "DISCORD");
  const u = (await res.json()) as { id: string; username: string; global_name?: string | null; avatar?: string | null };
  return {
    id: u.id,
    username: u.username,
    displayName: u.global_name || u.username,
    avatarUrl: u.avatar ? `${Url.discordCdn}/avatars/${u.id}/${u.avatar}.png?size=96` : null,
    loginAt: Date.now(),
  };
}

/** true kalau user member server wajib (atau berhasil dimasukkan otomatis) */
export async function ensureMember(token: string, userId: string): Promise<boolean> {
  if (!d.guildId) return true;

  if (d.botToken) {
    // PUT guild member: 201 = baru dimasukkan, 204 = sudah member
    const res = await fetch(`${Url.discordApi}/guilds/${d.guildId}/members/${userId}`, {
      method: "PUT",
      headers: { Authorization: `Bot ${d.botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: token }),
      signal: AbortSignal.timeout(15_000),
    });
    return res.status === 201 || res.status === 204;
  }

  const res = await fetch(`${Url.discordApi}/users/@me/guilds/${d.guildId}/member`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15_000),
  });
  return res.ok;
}
