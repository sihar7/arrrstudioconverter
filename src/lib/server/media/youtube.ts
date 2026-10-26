import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import Url from "@/Url/Url";
import { config } from "../config";
import { AppError } from "../http";
import { getJson, K, setJson } from "../redis";
import { run } from "./process";
import { bridgeDownload, bridgeEnabled, bridgeInfo, bridgePlaylist, FINAL_CODES } from "./bridge";
import { cobaltDownload, cobaltEnabled } from "./cobalt";
import { innertubeDownload, innertubeInfo, isFinalError } from "./innertube";
import { probe } from "./ffmpeg";
import { bgutil, maybeUpdateYtdlp, ytdlpBin } from "./tools";
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

// Rotasi proxy: tiap percobaan/pemanggilan maju satu proxy, jadi proxy yang ter-flag tidak dipakai terus
let proxyCursor = 0;
const nextProxy = (): string | undefined => {
  const list = config.bin.proxies;
  return list.length ? list[proxyCursor++ % list.length] : undefined;
};

/** youtubeArgs: extractor-args "youtube:" tambahan (mis. player_client=…) — digabung jadi satu flag */
function baseArgs(youtubeArgs: string[] = []): string[] {
  const args = ["--ignore-config", "--no-cache-dir", "--no-warnings", "--encoding", "utf-8", "--geo-bypass"];
  const cookies = resolveCookies();
  if (cookies) args.push("--cookies", cookies);
  const proxy = nextProxy();
  if (proxy) args.push("--proxy", proxy);
  // yt-dlp butuh JS runtime untuk tanda tangan YouTube & PO token; di Vercel tidak ada deno → pakai Node yang sedang jalan.
  // Lokal tanpa bgutil dilewati: binary lokal bisa versi lama yang belum kenal flag ini
  if (config.serverless || bgutil) args.push("--js-runtimes", `node:${process.execPath}`);
  // PO token dari bgutil → lolos verifikasi bot YouTube di IP datacenter
  if (bgutil) {
    args.push("--plugin-dirs", bgutil.plugins, "--extractor-args", `youtubepot-bgutilscript:server_home=${bgutil.home}`);
  }
  // Di server (IP datacenter) token selalu dikirim sejak request pertama, bukan menunggu diminta YouTube
  const yt = bgutil && config.serverless ? ["fetch_pot=always", ...youtubeArgs] : youtubeArgs;
  if (yt.length) args.push("--extractor-args", `youtube:${yt.join(";")}`);
  return args;
}

// Cache token bgutil di folder yang bisa ditulis (HOME di Vercel read-only)
const ytEnv = { XDG_CACHE_HOME: config.paths.tmp };

let warnedCookies = false;
/** IP datacenter (Vercel dkk.) sering kena "Sign in to confirm you're not a bot" — solusinya cookies akun YouTube */
function hintCookies(stderr: string) {
  if (warnedCookies || !stderr.includes("Sign in to confirm you")) return;
  warnedCookies = true;
  console.error(
    resolveCookies()
      ? "[yt-dlp] Bot check meski cookies terpasang — cookies kedaluwarsa/ter-flag (export ulang), tambah YTDLP_PROXY (proxy residensial) atau COBALT_API_URL."
      : "[yt-dlp] YouTube memblokir IP server. Isi env YTDLP_COOKIES_B64 (cookies.txt akun YouTube, base64), YTDLP_PROXY dan/atau COBALT_API_URL lalu redeploy.",
  );
}

const isBotCheck = (stderr: string) => /Sign in to confirm you|not a bot|HTTP Error 429/i.test(stderr);

// IP server sedang diblokir → job berikutnya langsung lewat cobalt (hemat 3× percobaan yt-dlp yang pasti gagal)
const BLOCKED_KEY = K("yt", "blocked");
const BLOCKED_TTL = 15 * 60;

function friendlyError(stderr: string): string {
  const map: [string, string][] = [
    ["Private video", "Video private"],
    ["Video unavailable", "Video tidak tersedia / sudah dihapus"],
    ["Sign in to confirm your age", "Video dibatasi umur"],
    ["members-only", "Video khusus member"],
    ["not available in your country", "Video diblokir di negara server"],
    ["Sign in to confirm you", "YouTube sedang memblokir server (verifikasi bot) — admin sudah diberi tahu, coba lagi nanti"],
    ["HTTP Error 429", "Terlalu banyak request ke YouTube, coba lagi nanti"],
    ["Requested format is not available", "Format audio tidak tersedia untuk video ini"],
    ["HTTP Error 403", "YouTube menolak unduhan dari server, coba lagi sebentar lagi"],
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

  // Durasi lewat InnerTube (< 1 dtk); yt-dlp hanya cadangan di lokal — di serverless spawn-nya lama & ikut diblokir
  const ytdlpDuration = () =>
    ytdlpBin()
      .then((bin) =>
        run(bin, [...baseArgs(), "--no-playlist", "--skip-download", "-O", "%(duration)s", Url.youtubeWatch + videoId], {
          timeoutMs: 25_000,
          label: "yt-dlp",
          env: ytEnv,
        }),
      )
      .then((r) => {
        const n = Number.parseFloat(r.stdout.trim().split(/\s+/).pop() ?? "");
        return Number.isFinite(n) ? Math.round(n) : null;
      })
      .catch(() => null);
  // Serverless: IP datacenter diblokir → jembatan Apps Script dulu
  const inner = (
    config.serverless && bridgeEnabled() ? bridgeInfo(videoId).catch(() => innertubeInfo(videoId)) : innertubeInfo(videoId)
  ).catch(() => null);

  const [meta, it] = await Promise.all([oembed, inner]);
  const dur = it?.duration || (config.serverless ? null : await ytdlpDuration());
  const info: VideoInfo = {
    videoId,
    title: meta?.title?.trim() || it?.title || videoId,
    author: meta?.author_name?.trim() || it?.author || "",
    thumbnail: thumbOf(videoId),
    duration: dur,
  };
  if (meta || it) await setJson(cacheKey, info, 86400);
  return info;
}

// ============================================================
// PLAYLIST
// ============================================================

export async function playlist(listId: string): Promise<{ title: string; items: PlaylistItem[] }> {
  const cacheKey = K("yt", "pl", listId);
  const cached = await getJson<{ title: string; items: PlaylistItem[] }>(cacheKey);
  if (cached) return cached;

  // Jembatan (1 request InnerTube browse) lebih cepat dari spawn yt-dlp & lolos blokir IP datacenter
  if (bridgeEnabled()) {
    try {
      const result = await bridgePlaylist(listId);
      await setJson(cacheKey, result, 3600);
      return result;
    } catch (e) {
      if (e instanceof AppError && FINAL_CODES.has(e.code)) throw new AppError(e.message, 404, e.code);
      console.error(`[bridge] playlist ${listId}:`, (e as Error).message);
    }
  }

  const bin = await ytdlpBin();
  const r = await run(
    bin,
    [...baseArgs(), "--flat-playlist", "-J", "--playlist-end", String(config.limits.playlistMax), Url.youtubePlaylist + listId],
    { timeoutMs: 60_000, label: "yt-dlp", env: ytEnv },
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
  // Gagal (bot check / format) → coba player client lain; tiap percobaan proxy berikutnya.
  // Percobaan pertama = kombinasi yang dipakai arrweb (tv,android,web); android_vr / tv / web_embedded
  // tidak butuh PO token sama sekali (PO Token Guide yt-dlp, Jul 2026)
  const attempts = [
    ["player_client=tv,android,web"],
    ["player_client=android_vr,tv,web_embedded"],
    ["player_client=web_safari,mweb,tv_simply"],
  ].slice(0, config.serverless ? 2 : 3); // serverless: hemat waktu, cadangan ini jarang lolos dari IP datacenter

  const viaCobalt = async (): Promise<SourceAudio | null> => {
    if (!cobaltEnabled()) return null;
    try {
      const src = await cobaltDownload(videoId, dir, onProgress);
      const { duration } = await probe(src);
      if (duration && duration > config.limits.maxDuration) {
        await fsp.rm(dir, { recursive: true, force: true });
        throw new AppError(`Video dilewati: lebih dari ${Math.floor(config.limits.maxDuration / 60)} menit`, 422, "TOO_LONG");
      }
      // Judul diisi dari oEmbed oleh pemanggil (jobs.ts); simpan info supaya cache sumber bisa dipakai ulang
      await fsp.writeFile(infoPath, JSON.stringify({ id: videoId, title: videoId, duration: duration ?? 0 }));
      return { path: src, title: videoId, duration: duration ?? 0 };
    } catch (e) {
      if (e instanceof AppError && e.code === "TOO_LONG") throw e;
      console.error(`[cobalt] ${videoId}:`, (e as Error).message);
      return null;
    }
  };

  // Lokal: InnerTube langsung → jembatan → yt-dlp → cobalt.
  // Serverless: jembatan dulu — dari IP datacenter jalur langsung hampir pasti kena bot check
  const direct = (): Promise<SourceAudio> => innertubeDownload(videoId, dir, config.limits.maxDuration, onProgress);
  const bridge = (): Promise<SourceAudio> => bridgeDownload(videoId, dir, config.limits.maxDuration, onProgress);
  const paths: [string, () => Promise<SourceAudio>][] = [["innertube", direct]];
  if (bridgeEnabled()) paths.splice(config.serverless ? 0 : 1, 0, ["bridge", bridge]);

  for (const [label, attempt] of paths) {
    try {
      const res = await attempt();
      await fsp.writeFile(infoPath, JSON.stringify({ id: videoId, title: res.title, duration: res.duration }));
      return res;
    } catch (e) {
      if (isFinalError(e) || (e instanceof AppError && FINAL_CODES.has(e.code))) {
        await fsp.rm(dir, { recursive: true, force: true });
        throw e;
      }
      console.error(`[${label}] ${videoId}:`, (e as Error).message);
      onProgress(0);
    }
  }

  const blocked = cobaltEnabled() && (await getJson<boolean>(BLOCKED_KEY));
  if (blocked) {
    const res = await viaCobalt();
    if (res) return res;
  }

  let lastErr = "Gagal mengambil audio dari YouTube";
  let botChecked = false;
  for (let i = 0; i < attempts.length; i++) {
    const bin = await ytdlpBin();
    const r = await run(bin, [...baseArgs(attempts[i]), ...common, Url.youtubeWatch + videoId], {
      timeoutMs: 5 * 60_000,
      label: "yt-dlp",
      env: ytEnv,
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
      if (blocked) await setJson(BLOCKED_KEY, false, 1);
      return { path: src, title: info.title || videoId, duration: Number(info.duration) || 0 };
    }
    lastErr = friendlyError(r.stderr);
    hintCookies(r.stderr);
    if (isBotCheck(r.stderr)) botChecked = true;
    if (!retryable(r.stderr)) break;
    if (i === 0) await maybeUpdateYtdlp();
  }

  if (botChecked) {
    await setJson(BLOCKED_KEY, true, BLOCKED_TTL);
    if (!blocked) {
      const res = await viaCobalt();
      if (res) return res;
    }
  }
  await fsp.rm(dir, { recursive: true, force: true });
  throw new AppError(lastErr, 422, "YOUTUBE");
}
