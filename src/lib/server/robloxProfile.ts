import "server-only";
import Url from "@/Url/Url";
import { AppError } from "./http";
import { getJson, K, setJson } from "./redis";
import type { RobloxProfile } from "@/type/roblox";

// Profil publik pemilik API key (user / grup) untuk kartu di Pengaturan — tanpa API key, di-cache 1 jam

const TTL = 3600;

async function json(url: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    return r.ok ? ((await r.json()) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function thumb(path: string): Promise<string | null> {
  const d = await json(`${Url.robloxThumbs}/${path}`);
  const first = (d?.data as { imageUrl?: string; state?: string }[] | undefined)?.[0];
  return first?.state === "Completed" && first.imageUrl ? first.imageUrl : null;
}

export async function getProfile(type: "user" | "group", id: string): Promise<RobloxProfile> {
  const key = K("rbxprofile", type, id);
  const cached = await getJson<RobloxProfile>(key);
  if (cached) return cached;

  let profile: RobloxProfile;
  if (type === "user") {
    const [info, avatar, body] = await Promise.all([
      json(`${Url.robloxUsers}/${id}`),
      thumb(`users/avatar-headshot?userIds=${id}&size=150x150&format=Png&isCircular=false`),
      thumb(`users/avatar?userIds=${id}&size=420x420&format=Png&isCircular=false`),
    ]);
    if (!info?.name) throw new AppError("User Roblox tidak ditemukan", 404, "NOT_FOUND");
    profile = {
      type,
      id,
      name: String(info.name),
      displayName: String(info.displayName ?? info.name),
      verified: Boolean(info.hasVerifiedBadge),
      avatarUrl: avatar,
      bodyUrl: body,
      created: typeof info.created === "string" ? info.created : null,
      memberCount: null,
      owner: null,
    };
  } else {
    const [info, icon] = await Promise.all([
      json(`${Url.robloxGroups}/${id}`),
      thumb(`groups/icons?groupIds=${id}&size=420x420&format=Png&isCircular=false`),
    ]);
    if (!info?.name) throw new AppError("Grup Roblox tidak ditemukan", 404, "NOT_FOUND");
    const owner = info.owner as { username?: string } | null;
    profile = {
      type,
      id,
      name: String(info.name),
      displayName: String(info.name),
      verified: Boolean(info.hasVerifiedBadge),
      avatarUrl: icon,
      bodyUrl: icon,
      created: null,
      memberCount: typeof info.memberCount === "number" ? info.memberCount : null,
      owner: owner?.username ?? null,
    };
  }
  await setJson(key, profile, TTL);
  return profile;
}
