// Sumber audio selain YouTube — dipakai bersama web (deteksi link saat mengetik) & BE (validasi + unduh).
// File ini identik di web & BE.
//
// Keamanan: link user TIDAK pernah diteruskan mentah ke yt-dlp. Link → ID ber-namespace yang lolos regex ketat
// (mis. "tt:7351234567890123456") → URL kanonik dibangun ulang dari host tetap (cegah SSRF & injeksi argumen).
// ID YouTube tetap 11 karakter polos supaya data lama (antrean, riwayat) tidak berubah.

export type Platform = "youtube" | "tiktok" | "soundcloud" | "instagram" | "x" | "facebook";

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

interface Rule {
  platform: Exclude<Platform, "youtube">;
  /** prefix ID */
  ns: string;
  /** pola ID tanpa prefix */
  re: RegExp;
  /** ID tervalidasi → URL kanonik */
  url: (id: string) => string;
}

const RULES: Rule[] = [
  { platform: "tiktok", ns: "tt", re: /^\d{8,22}$/, url: (id) => `https://www.tiktok.com/@/video/${id}` },
  // Link pendek vm./vt.tiktok.com & tiktok.com/t/… — diurai yt-dlp
  { platform: "tiktok", ns: "ttv", re: /^[A-Za-z0-9]{5,16}$/, url: (id) => `https://vm.tiktok.com/${id}/` },
  { platform: "soundcloud", ns: "sc", re: /^[A-Za-z0-9_-]{1,64}\/[A-Za-z0-9_-]{1,120}$/, url: (id) => `https://soundcloud.com/${id}` },
  { platform: "soundcloud", ns: "sco", re: /^[A-Za-z0-9]{4,24}$/, url: (id) => `https://on.soundcloud.com/${id}` },
  { platform: "instagram", ns: "ig", re: /^[A-Za-z0-9_-]{5,40}$/, url: (id) => `https://www.instagram.com/reel/${id}/` },
  { platform: "x", ns: "x", re: /^\d{5,25}$/, url: (id) => `https://x.com/i/status/${id}` },
  { platform: "facebook", ns: "fb", re: /^\d{5,25}$/, url: (id) => `https://www.facebook.com/reel/${id}` },
  { platform: "facebook", ns: "fbw", re: /^[A-Za-z0-9_-]{4,24}$/, url: (id) => `https://fb.watch/${id}/` },
];

const BY_NS = new Map(RULES.map((r) => [r.ns, r]));

/** ID sumber valid: YouTube 11 karakter atau "<ns>:<id>" yang lolos pola platformnya */
export function isSourceId(id: string): boolean {
  if (YT_ID.test(id)) return true;
  const i = id.indexOf(":");
  if (i < 1) return false;
  const rule = BY_NS.get(id.slice(0, i));
  return Boolean(rule && rule.re.test(id.slice(i + 1)));
}

export const isYoutubeId = (id: string) => YT_ID.test(id);

export function platformOf(id: string): Platform {
  if (YT_ID.test(id)) return "youtube";
  return BY_NS.get(id.slice(0, id.indexOf(":")))?.platform ?? "youtube";
}

/** URL kanonik untuk ID non-YouTube (null = bukan ID sosial yang valid) */
export function sourceUrl(id: string): string | null {
  const i = id.indexOf(":");
  if (i < 1) return null;
  const rule = BY_NS.get(id.slice(0, i));
  const rest = id.slice(i + 1);
  return rule && rule.re.test(rest) ? rule.url(rest) : null;
}

const make = (ns: string, v: string | undefined): string | null => {
  const rule = BY_NS.get(ns);
  return v && rule && rule.re.test(v) ? `${ns}:${v}` : null;
};

/** Link TikTok / SoundCloud / Instagram / X / Facebook → ID ber-namespace; null = bukan link yang didukung */
export function parseSocialLink(raw: string): { id: string; platform: Exclude<Platform, "youtube"> } | null {
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, "");
  const p = u.pathname.split("/").filter(Boolean);
  let id: string | null = null;

  if (host === "tiktok.com") {
    // /@user/video/<id> · /@user/photo/<id> tidak (bukan audio) · /v/<id>.html · /embed/v2/<id> · /t/<kode>
    const vi = p.indexOf("video");
    if (vi >= 0) id = make("tt", p[vi + 1]);
    else if (p[0] === "v") id = make("tt", p[1]?.replace(/\.html$/, ""));
    else if (p[0] === "embed") id = make("tt", p[p.length - 1]);
    else if (p[0] === "t") id = make("ttv", p[1]);
  } else if (host === "vm.tiktok.com" || host === "vt.tiktok.com") {
    id = make("ttv", p[0]);
  } else if (host === "soundcloud.com") {
    // /artis/lagu — bukan /artis/sets/… (playlist), /discover, dll
    const reserved = new Set(["sets", "albums", "tracks", "likes", "reposts", "popular-tracks", "followers", "following"]);
    if (p.length === 2 && !reserved.has(p[1]) && !["discover", "search", "you", "stream", "charts"].includes(p[0])) id = make("sc", `${p[0]}/${p[1]}`);
  } else if (host === "on.soundcloud.com") {
    id = make("sco", p[0]);
  } else if (host === "instagram.com") {
    if (["reel", "reels", "p", "tv"].includes(p[0])) id = make("ig", p[1]);
  } else if (host === "x.com" || host === "twitter.com") {
    const si = p.indexOf("status");
    if (si >= 0) id = make("x", p[si + 1]);
  } else if (host === "facebook.com") {
    if (p[0] === "reel") id = make("fb", p[1]);
    else if (p[0] === "watch") id = make("fb", u.searchParams.get("v") ?? undefined);
    else {
      const vi = p.indexOf("videos");
      if (vi >= 0) id = make("fb", p[vi + 1]);
    }
  } else if (host === "fb.watch") {
    id = make("fbw", p[0]);
  }
  return id ? { id, platform: platformOf(id) as Exclude<Platform, "youtube"> } : null;
}
