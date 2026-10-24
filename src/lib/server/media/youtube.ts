import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import Url from "@/Url/Url";
import { config } from "../config";
import { AppError } from "../http";
import { getJson, K, setJson } from "../redis";
import { run } from "./process";
import { maybeUpdateYtdlp, ytdlpBin } from "./tools";
import type { PlaylistItem, VideoInfo } from "@/type/converter";

// Keamanan: URL user TIDAK pernah diteruskan mentah ke yt-dlp — hanya ID hasil regex
// yang dibangun ulang jadi URL youtube.com (cegah SSRF & injeksi argumen).

const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const LIST_RE = /^[A-Za-z0-9_-]{10,64}$/;
const HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

function toUrl(input: string): URL | null {
  try {
    return new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    return null;
  }
}

export function parseVideoId(input: string): string | null {
  const s = input.trim();
  if (ID_RE.test(s)) return s;
  const u = toUrl(s);
  if (!u) return null;
  const host = u.hostname.toLowerCase();
  if (host === "youtu.be" || host === "www.youtu.be") {
    const id = u.pathname.slice(1, 12);
    return ID_RE.test(id) ? id : null;
  }
  if (!HOSTS.has(host)) return null;
  const v = u.searchParams.get("v");
  if (v && ID_RE.test(v)) return v;
  const m = u.pathname.match(/^\/(?:shorts|embed|live|v|e)\/([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function parsePlaylistId(input: string): string | null {
  const u = toUrl(input.trim());
  if (!u || !HOSTS.has(u.hostname.toLowerCase())) return null;
  const list = u.searchParams.get("list");
  // Mix otomatis (RD...) tidak berhingga → tidak didukung
  return list && LIST_RE.test(list) && !list.startsWith("RD") ? list : null;
}

export const thumbOf = (videoId: string) => `${Url.youtubeThumb}/${videoId}/hqdefault.jpg`;

let cookiesFile: string | null | undefined;

/** cookies.txt: path dari YTDLP_COOKIES, atau ditulis sekali ke /tmp dari YTDLP_COOKIES_B64 */
function resolveCookies(): string | null {
  if (cookiesFile !== undefined) return cookiesFile;
  cookiesFile = null;
  if (config.bin.cookies && fs.existsSync(config.bin.cookies)) {
    cookiesFile = config.bin.cookies;
  } else if (config.bin.cookiesB64) {
    const target = path.join(config.paths.tmp, "yt-cookies.txt");
    fs.mkdirSync(config.paths.tmp, { recursive: true });
    fs.writeFileSync(target, Buffer.from(config.bin.cookiesB64, "base64"));
    cookiesFile = target;
  }
  return cookiesFile;
}

function baseArgs(): string[] {
  const args = ["--ignore-config", "--no-cache-dir", "--no-warnings", "--encoding", "utf-8"];
  const cookies = resolveCookies();
  if (cookies) args.push("--cookies", cookies);
  if (config.bin.proxy) args.push("--proxy", config.bin.proxy);
  // yt-dlp butuh JS runtime untuk tanda tangan YouTube; di Vercel tidak ada deno → pakai Node yang sedang jalan.
  // Hanya di serverless: binary selalu versi terbaru (lokal bisa versi lama yang belum kenal flag ini)
  if (config.serverless) args.push("--js-runtimes", `node:${process.execPath}`);
  return args;
}

let warnedCookies = false;
/** IP datacenter (Vercel dkk.) sering kena "Sign in to confirm you're not a bot" — solusinya cookies akun YouTube */
function hintCookies(stderr: string) {
  if (warnedCookies || !stderr.includes("Sign in to confirm you")) return;
  warnedCookies = true;
  console.error(
    resolveCookies()
      ? "[yt-dlp] Bot check meski cookies terpasang — cookies kedaluwarsa/ter-flag (export ulang) atau pakai YTDLP_PROXY (proxy residensial)."
      : "[yt-dlp] YouTube memblokir IP server. Isi env YTDLP_COOKIES_B64 (cookies.txt akun YouTube, base64) dan/atau YTDLP_PROXY lalu redeploy.",
  );
}

function friendlyError(stderr: string): string {
  const map: [string, string][] = [
    ["Private video", "Video private"],
    ["Video unavailable", "Video tidak tersedia / sudah dihapus"],
    ["Sign in to confirm your age", "Video dibatasi umur"],
    ["members-only", "Video khusus member"],
    ["not available in your country", "Video diblokir di negara server"],
    ["Sign in to confirm you", "YouTube sedang memblokir server (verifikasi bot) — coba lagi beberapa saat lagi"],
    ["HTTP Error 429", "Terlalu banyak request ke YouTube, coba lagi nanti"],
    ["Requested format is not available", "Format audio tidak tersedia untuk video ini"],
  ];
  for (const [needle, msg] of map) if (stderr.includes(needle)) return msg;
  const errs = [...stderr.matchAll(/ERROR:\s*(.+)/g)];
  if (errs.length) {
    const line = errs[errs.length - 1][1].replace(/^\[[^\]]+\]\s*[A-Za-z0-9_-]+:\s*/, "").trim();
    return line.length > 160 ? `${line.slice(0, 157)}…` : line;
  }
  return "Gagal mengambil audio dari YouTube";
}

const retryable = (msg: string) => /format|Sign in|bot|nsig|signature|403/i.test(msg);

// ============================================================
// INFO (oEmbed cepat + durasi via yt-dlp), di-cache 1 hari
// ============================================================

export async function videoInfo(videoId: string): Promise<VideoInfo> {
  const cacheKey = K("yt", "info", videoId);
  const cached = await getJson<VideoInfo>(cacheKey);
  if (cached) return cached;

  const oembed = fetch(
    `${Url.youtubeOembed}?format=json&url=${encodeURIComponent(Url.youtubeWatch + videoId)}`,
    { signal: AbortSignal.timeout(8000) },
  )
    .then(async (r) => {
      if (r.status === 401 || r.status === 403 || r.status === 404) throw new AppError("Video tidak ditemukan / private", 404, "NOT_FOUND");
      if (!r.ok) return null;
      return (await r.json()) as { title?: string; author_name?: string };
    })
    .catch((e) => {
      if (e instanceof AppError) throw e;
      return null;
    });

  const duration = ytdlpBin()
    .then((bin) =>
      run(bin, [...baseArgs(), "--no-playlist", "--skip-download", "-O", "%(duration)s", Url.youtubeWatch + videoId], {
        timeoutMs: 25_000,
        label: "yt-dlp",
      }),
    )
    .then((r) => {
      const n = Number.parseFloat(r.stdout.trim().split(/\s+/).pop() ?? "");
      return Number.isFinite(n) ? Math.round(n) : null;
    })
    .catch(() => null);

  const [meta, dur] = await Promise.all([oembed, duration]);
  const info: VideoInfo = {
    videoId,
    title: meta?.title?.trim() || videoId,
    author: meta?.author_name?.trim() || "",
    thumbnail: thumbOf(videoId),
    duration: dur,
  };
  if (meta) await setJson(cacheKey, info, 86400);
  return info;
}

// ============================================================
// PLAYLIST
// ============================================================

export async function playlist(listId: string): Promise<{ title: string; items: PlaylistItem[] }> {
  const cacheKey = K("yt", "pl", listId);
  const cached = await getJson<{ title: string; items: PlaylistItem[] }>(cacheKey);
  if (cached) return cached;

  const bin = await ytdlpBin();
  const r = await run(
    bin,
    [...baseArgs(), "--flat-playlist", "-J", "--playlist-end", String(config.limits.playlistMax), Url.youtubePlaylist + listId],
    { timeoutMs: 60_000, label: "yt-dlp" },
  );
  if (r.code !== 0) {
    hintCookies(r.stderr);
    throw new AppError(friendlyError(r.stderr), 422, "YOUTUBE");
  }

  let data: { title?: string; entries?: { id?: string; title?: string; duration?: number }[] };
  try {
    data = JSON.parse(r.stdout);
  } catch {
    throw new AppError("Respons playlist tidak terbaca", 502, "YOUTUBE");
  }
  const items = (data.entries ?? [])
    .filter((e) => e.id && ID_RE.test(e.id) && e.title !== "[Private video]" && e.title !== "[Deleted video]")
    .map((e) => ({ videoId: e.id!, title: e.title || e.id!, duration: e.duration ? Math.round(e.duration) : null }));
  if (!items.length) throw new AppError("Playlist kosong / private", 404, "NOT_FOUND");

  const result = { title: data.title || "Playlist", items };
  await setJson(cacheKey, result, 3600);
  return result;
}

// ============================================================
// DOWNLOAD AUDIO SUMBER (di-cache per video, dipakai ulang untuk setting berbeda)
// ============================================================

export interface SourceAudio {
  path: string;
  title: string;
  duration: number;
}

const inflight = new Map<string, Promise<SourceAudio>>();

export function downloadSource(videoId: string, onProgress: (pct: number) => void): Promise<SourceAudio> {
  const running = inflight.get(videoId);
  if (running) return running;
  const p = doDownload(videoId, onProgress).finally(() => inflight.delete(videoId));
  inflight.set(videoId, p);
  return p;
}

async function findSource(dir: string) {
  const files = await fsp.readdir(dir).catch(() => [] as string[]);
  const f = files.find((n) => n.startsWith("source.") && !/\.(part|ytdl|tmp)$/.test(n));
  return f ? path.join(dir, f) : null;
}

async function doDownload(videoId: string, onProgress: (pct: number) => void): Promise<SourceAudio> {
  const dir = path.join(config.paths.cache, videoId);
  const infoPath = path.join(dir, "info.json");

  const existing = await findSource(dir);
  if (existing && fs.existsSync(infoPath)) {
    const now = new Date();
    await fsp.utimes(dir, now, now).catch(() => {});
    const info = JSON.parse(await fsp.readFile(infoPath, "utf8")) as { title?: string; duration?: number };
    onProgress(100);
    return { path: existing, title: info.title || videoId, duration: Number(info.duration) || 0 };
  }

  await fsp.rm(dir, { recursive: true, force: true });
  await fsp.mkdir(dir, { recursive: true });

  const common = [
    ...baseArgs(),
    "--no-playlist",
    "--newline",
    "--no-mtime",
    "--progress-template",
    "download:ARRP %(progress._percent_str)s",
    "--match-filter",
    `!is_live & duration <=? ${config.limits.maxDuration}`,
    "-f",
    "bestaudio/best",
    "-P",
    dir,
    "-o",
    "source.%(ext)s",
    "--print-to-file",
    "after_move:%(.{id,title,duration,uploader})j",
    infoPath.replace(/%/g, "%%"),
  ];
  // Gagal (bot check / format) → coba player client lain yang tidak butuh PO token
  const attempts = [
    common,
    [...common, "--extractor-args", "youtube:player_client=tv_simply,tv,web_embedded"],
    [...common, "--extractor-args", "youtube:player_client=web_safari,mweb,android"],
  ];

  let lastErr = "Gagal mengambil audio dari YouTube";
  for (let i = 0; i < attempts.length; i++) {
    const bin = await ytdlpBin();
    const r = await run(bin, [...attempts[i], Url.youtubeWatch + videoId], {
      timeoutMs: 5 * 60_000,
      label: "yt-dlp",
      onLine: (line) => {
        const m = line.match(/ARRP\s+([\d.]+)%/);
        if (m) onProgress(Math.min(100, Number.parseFloat(m[1])));
      },
    });
    if (r.code === 0) {
      const src = await findSource(dir);
      if (!src) {
        throw new AppError(
          `Video dilewati: siaran live / lebih dari ${Math.floor(config.limits.maxDuration / 60)} menit`,
          422,
          "TOO_LONG",
        );
      }
      const info = fs.existsSync(infoPath)
        ? (JSON.parse(await fsp.readFile(infoPath, "utf8")) as { title?: string; duration?: number })
        : {};
      return { path: src, title: info.title || videoId, duration: Number(info.duration) || 0 };
    }
    lastErr = friendlyError(r.stderr);
    hintCookies(r.stderr);
    if (!retryable(r.stderr)) break;
    if (i === 0) await maybeUpdateYtdlp();
  }
  await fsp.rm(dir, { recursive: true, force: true });
  throw new AppError(lastErr, 422, "YOUTUBE");
}
